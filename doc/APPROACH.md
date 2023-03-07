# Approach: Design & Trade-offs

## Outcomes

The outcomes for the project were the following:

- a driver that is portable between different versions of Node.js
- a driver that provides an API that is natural to the Node.js developer (considers programming idioms)
- a driver that is simply shippable and seamlessly fits into their existing Docker-based SDLC
- simplify maintenance to testing of the driver
- predictable, measurable, quality using existing Node.js tooling, or Linux tooling
- open-source, and deliverable to npmjs.org

The following are non-requirements:

- it is not a requirement for customers to compile the driver themselves (though they certainly can do so)
- support for Mac or Windows

## Features

The features to accomplish these were:

- use of Docker-based multi-staged builds to remove driver developer environment dependencies; codify all developer dependencies in Dockerfiles
- use of Mocha.js as the unit testing framework of choice in the Node.js world
- use of Linux Valgrind to detect memory leaks
- deliver a demo application to illustrate best practice, and some coding idioms
- use of GNU make for the top-level driver-developer build system, and a comprehensive, documented, set of targets for each development step, inclusive of starting up, shutting down, and working with, a NuoDB cluster
- integration with the Google V8 engine using the "Native Abstractions for Node.js" (NAN) API, which abstracts away differences between different versions of the v8 Engine.

## Trade-Off: Google V8 Engine APIs

The first tier choice and trade-off involved choosing with abstraction layer to use for Node.js, or more specifically, for the v8 Engine which is the ECMAScript engine at its kernel.

There are multiple ways of working with the v8 engine:

- use the v8 engine APIs directly, and deal with version incompatibilities yourself (viable option, it's what Electron does, for example), but requires more time investment
- use the NAN API, which is what is most commonly used by integrators, including Oracle, MySQL, Postgres, etc; this option supports a vast range of v8 Engine APIs, from Node.js version 0.10, up until the latest version 10.
- use the Node Addon API (N-API) and its C++ wrappers; which only supports Node.js version 8 and newer. This is actually the Node.js ABI, beta in version 8, and officially released in version 10.

Originally I tried to use N-API. Given it's the official ABI for Node.js now, the thought was that it would provide the longest term, most stable, approach for implementing a driver. However, a number of issues mounted, which ultimately led to a decision to abandon N-API:

- 15% process failure rates, asserts being triggered down in the NuoDB Mutex.cpp class
- massive memory leaks
- no purely native way of dealing with Date/Time without dispatch back into the JS engine to eval a Date class constructor (performance implications)
- reference counting issues in the ABI, possible SIGSEGVs

At the six week mark, given the mounting issues with the ABI, I decided to pivot to using NAN. The entire framework, minus NuoDB-specific code, was swapped out. Net-result: zero failures, zero memory leaks. A decision that paid out.

## Trade-Off: Language Evolution & Design

It was desireable to make the user API for the driver natural for the Node.js, and Javascript, user. This meant that basic idioms, intrinsic to Javascript development, must be supported. Of these the following were all paramount, and were chosen to be supported:

- **callbacks** - Node.js has a single threaded main-event loop, but long running activities can be made asynchronous; ideal for operations such as those involving databases, sockets, IO, ... This is accomplished with the **callback-based** approach commonly seen throughout Javascript code.
- **async/await** - sometimes the callback model becomes a burden, some people call this *callback-hell* - where when you're dealing with heavily nested objects, each of which has its own async APIs, the outcome is heavily nested callback hierarchies that are difficult to read and debug (see examples in the tests). A way to keep asynchronous nature of your code, while being able to code in a way that looks synchronous (where it's easy to reason about), is by declaring a encapsulating function (a scope) to be `async` and then when calling async methods on objects within its scope, perform the call with an `await` keyword present (see online for examples, or the numerous examples herein); behind the scenes the call is scheduled to be performed and the result is returned to the caller as a return value (no need to write a callback which acts as a receiver of the result)
- **promises** - another model for dealing with callback-hell, a promise is an IOU for a result; the benefit of IOUs is that you can schedule as many as you wish, then later redeem that IOU for the actual result. The latter operation is a blocking operation. The power of promises is that you can combine long chains of them through a library called `async` to codify serial, parallel, or other interesting patterns.

A promise is a linguistic wrapper over the existing callback mechanisms. In effect what promises do is add one extra callback to the tail of all calls. Given a mode where methods have non-callback arguments first, and the callback last, and the callback is always an error-first callback, the promise infrastructure adds one additional callback to the argument list; this callback is used internally within Javascript to handle IOUs, allowing users to redeem the IOUs at a later time for the result. This observation is important as we will detail in a moment. But suffice to say at this point, promise support is added at the Javascript layer using the built-in `promisify` utility, which you see used throughout the `lib` directory of `.js` files. The **trade-off here**  was between coding promises in C++ (which you can do) versus integrating them at the Javascript layer. A choice was made to integrate promises at the Javascript layer, hence when you look at the JS code you will see calls to promisify calls.

The support for async/await is at the language level; so long as your API supports callbacks, you can naturally use the async/await keywords. However, when integrating Promises into the API, care must be exercised so that dispatch of callbacks are performed using the original callbacks, not those introduced by the introduction of promises. When dispatching to the native C++ layer, the C++ code must be careful to NOT treat the last argument of the argument list as the callback to dispatch results back too, for doing so would cause an infinite loop (stack overflow) within the Promise code, instead the C++ code needs to walk through the argument list in-order to find the first Function object, and it's this object that is the callback to return results to.

## Node.js / v8 Threading Model

An important point mentioned earlier, Node.js is single-threaded -- well, sort of... It has only a single thread acting within its main event-loop, but does support worker threads. Implications are these...

- all interaction with JS objects, the runtime, etc MUST be made from the main event loop thread; all methods in the C++ code that are declared as a **NAN_METHOD** are methods that can be dispatched to from JS (provided they are first registered with the runtime (see **NAN_MODULE_INIT**). These methods may interact with V8.
- worker threads can handle async work, and work is scheduled using the AsyncWorker API; doing so will place work onto a `libuv` queue. The `execute` function for `libuv` is the async (database) logic and MUST NOT call any V8 API or NAN wrapper API. The associated `after-execute` method can interact with V8 and is used to dispatch results back to the user through the provided callback (if any). The basic model is as follows:
  - the NAN_METHOD parses any inputs, translating them into non V8 objects (pure C++ objects), and createss an AsyncWorker object, and queues the work
  - the execute method executes against the database, and sets up return values (pure C++ objects)
  - the after-execute method is called automatically, and the results are translated into V8 objects (String, Number, Date, etc), and the given callback is called, passing the results as its second argument
  - if an error occurs during the execute call, a different `after-*` method is called, allowing you to raise a Javascript exception with some meaningful error message

This overall model of main-thread queueing work, the worker doing the work, then the worker dispatching the results back to the main event loop thread, you will see repeated throughout the code base.

## API Design

Apart from supporting callbacks, async/await, and promises, the API is built around the following model:

- **Driver** : has a method to create and return Connection objects
- **Connection** : has a method to execute and return ResultSet objects
- **ResultSet** : method to iterate over rows

See the `lib` directory to see wrappers for each of these types.

In addition to creating Connection objects, a Driver (in the JS code) also provides logic to pull configuration, optionally from a hash passed into the `connect` method, which incidentally is supplemented (overridden) with values pulled from the environment; users may provide all connection configuration parameters as environment variables or through a static hash. It is recommended, for security reasons, and ease of integration with the Docker model, to use environment variables instead.

An additional feature of the API are two configurable means for how results are returned, and specifically, whether each row is returned as an array of values, or as a Javascript Object. If it's the latter, for each column name in the result set, a Javascript Object key-value pair is added to the JS object. With the array-based approach, users are presented with an array of values.

## Docker-based Builds

As we said earlier, the entire build and test process is encapsulated behind a Docker veneer. To accomplish this is straight-forward, we use Docker multi-stage builds -- which decisively require a recent version of Docker. In `dockers/centos/Dockerfile` you will see three stages of builds, each building upon another. The net benefit of this is that we can codify all the tooling inside Docker, and also when preparing release images, copy from base build images only those artifacts meant for distribution. A natural outcome of this approach is actually smaller image sizes, as no intermediate (and duplicate) layers are introduced during the **COPY** instruction. So, in theory, the only things needed for local development are as follows:

- **git** : to checkout the project
- **make** : to build the project
- **docker** : to build and test the driver itself, and build release Docker images

## Docker Deliverables

Lastly, there are three Docker deliverables to Docker Hub...

- **nuodb/node:{8|10}-centos** - there are no CentOS Node.js Dockers in official publication, these are forks of official Docker distros' but built with CentOS for our customers that demand them
- **nuodb/node-nuodb:{8|10|latest}[-centos]** - the Docker that includes the Node.js driver, a Docker image customers may extend with their applications
- nuodb/node-nuodb:{8|10}-onbuild - ONBUILD variants of the driver image.

More detail is available in the [online documentation][0] on usage of the API and of the Dockers distributed.

[0]: https://nuodb.github.io/node-nuodb/

## Internal Build Process

We said that we wrap the whole build process using Docker, but what do the Dockers themselves run?

In the world of Node.js there are two fundamental tools related to packaging, dependency management, and for compilation. The tools are:

- `node-gyp` : for compiling native code, e.g. C/C++
- `npm` : for identifying the package, and for declaring dependencies

For each of these there is a file present in projects:

- `node-gyp`: `"binding.gyp"`
- `npm`: `"package.json"`

For the uninitiated, best to look at online documentation, or peek at the files in this project; it's fairly straight-forward though.