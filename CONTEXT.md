# Hermes Tiiny Router

An npm-distributed add-on for the Hermes agent harness that runs delegated
sub-agents on a Tiiny appliance, routing each subtask to the model that fits
its shape.

## Language

### Distribution

**Package**:
The npm artifact that carries the routing backend, the controller and the
skill, plus the installer that places them into a Hermes home.
_Avoid_: plugin (for this meaning), module, bundle

**Routing backend**:
The Hermes delegation provider that picks a model for each delegated task.
_Avoid_: plugin, router plugin, delegation plugin

**Controller**:
The command-line tool that plans a batch, locks the device, loads and
evicts models, and releases the device.
_Avoid_: lifecycle script, swap script, ctl

**Skill**:
The instructions that tell a manager agent how to drive the controller and
delegate through the routing backend.
_Avoid_: playbook, guide
