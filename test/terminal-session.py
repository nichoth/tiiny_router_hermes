"""Run a command in a terminal and answer only after its prompt appears."""
import errno
import fcntl
import os
import pty
import select
import signal
import struct
import sys
import termios
import time


pid, fd = pty.fork()
if pid == 0:
    fcntl.ioctl(1, termios.TIOCSWINSZ, struct.pack('HHHH', 24, 72, 0, 0))
    os.execv(sys.argv[2], sys.argv[2:])

output = b''
answered = False
reaped = False
deadline = time.monotonic() + 15
try:
    while True:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise TimeoutError('terminal command timed out')
        if not select.select([fd], [], [], remaining)[0]:
            raise TimeoutError('terminal command timed out')
        try:
            chunk = os.read(fd, 8192)
        except OSError as error:
            if error.errno != errno.EIO:
                raise
            break
        if not chunk:
            break
        output += chunk
        sys.stdout.buffer.write(chunk)
        sys.stdout.buffer.flush()
        if not answered and b'[y/N] ' in output:
            os.write(fd, (sys.argv[1] + '\n').encode())
            answered = True
    _, status = os.waitpid(pid, 0)
    reaped = True
    if not answered:
        raise AssertionError('command exited before displaying its prompt')
    sys.exit(os.waitstatus_to_exitcode(status))
finally:
    if not reaped:
        os.kill(pid, signal.SIGKILL)
        os.waitpid(pid, 0)
    os.close(fd)
