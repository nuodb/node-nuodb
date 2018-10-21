# node-nuodb

Node.js N-API C++ ABI NuoDB Driver

## Approach and Technology

The approach is to use the N-API / C++ NAPI APIs so that
multiple versions of node are supported (8.10 and 10.10),
as well as all versions going forward as we will henceforth
have ABI compatibility. The C++ ABI also simplifies coding.

The approach is to support async/await/promise style Javascript code over supporting sync code. The latter is not conventional, and will be supported only as time permits;
however, the scope of work is purely test oriented as the
core logic for sync will already be there.

The approach is to employ a multistage Docker build to
not only provide the test environment for NuoDB development,
but also to provide both standard CentOS/RHEL node base images, but also node-nuodb CentOS/RHEL images to customers.

The approach will be to perform ALL testing of the driver on the language integration side (Javascript RT) rather than in C++ as it's the final language integration that matters, and documents the full capabilities of the API.

## Project Plan

The plan has two phases.

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
| Await   | --- | 1d |

The goal of the second phase is to complete the integration of each work area,
inclusive of unit tests. The steps and current status

|   STEP  |   STATUS  |  DURATION |
|---------|:-------------:|------:|
| Commit        | --- | 2d |
| Execute       | --- | 2d |
| Results       | --- | 5d |
| Prepare       | --- | 5d |
| RO Properties | --- | 2d |
| Memory Leaks / Tuning  | --- | 5d |
| Sync | --- | 5d |
