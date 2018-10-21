# Approach and Technology

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
