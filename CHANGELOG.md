# Change Log

## Project Plan

The plan has three phases.

The goal in the first phase is to learn about the challenges and problem space.
Doing this we surface the breadth of challenges early, we can more accurately
scope the project since the complexities are fully known, and now knowing the
challenges and how to address those challenges we are in a better position to
mete out work to others as subsequent work is effectively a mechanical exercise.
The steps and current statuses of the first phase are:

|   STEP  |   STATUS  |  DURATION |
|---------|:-------------:|------:|
| Builds  | DONE | 1d |
| Docker  | DONE | 1d |
| Async   | DONE | 2d |
| Promise | DONE | 1d |
| Await   | DONE | 1d |

The goal of the second phase is to complete the integration of each work area,
inclusive of unit tests. The steps and current status are:

|   STEP  |   STATUS  |  DURATION |
|---------|:-------------:|------:|
| Commit        | DONE | 2d |
| Read-Only + Auto-Commit        | DONE | 1d |
| Prepare       | WIP | 5d |
| Execute       | WIP | 2d |
| Results       | WIP | 5d |
| Results - Streams       | --- | 3d |
| RowMode       | --- | 1d |
| Rows v ResultSet | --- | 2d |

The goal of the third phase is to stabilize and tune the integration.

|   STEP  |   STATUS  |  DURATION |
|---------|:-------------:|------:|
| Memory Leaks / Tuning  | --- | 5d |
| Documentation | --- | 1d |

## Packaging

Ideally we would like to install the current package globally. However
Docker does not permit this, citing an aufs permissions issue writing
to the /usr/local/lib/node_modules directory.

Another option is to set for the ONBUILD variant the location of the
addon module using `RUN node --napi-modules /path/to/addon.js` so the
clients end user Dockers can pick up the module.
