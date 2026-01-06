# Copyright (c) 2018-2019, NuoDB, Inc.
# All rights reserved.
#
# Redistribution and use permitted under the terms of the 3-clause BSD license.

VERSION:=$(shell jq -r .version package.json)
UNCRUSTIFY:=uncrustify
TTY:=-it
ifdef NO_TTY
	TTY:=-t
endif

#:help: help        | Displays the GNU makefile help
.PHONY: help
help: ; @sed -n 's/^#:help://p' Makefile

#:help: version     | Displays the current release version (see package.json)
.PHONY: version
version:
	@echo $(VERSION)

#:help: all         | Runs the `clean` and `release` targets
.PHONY: all
all: clean release

#:help: format      | format the C++ source code
.PHONY: format
format:
	$(UNCRUSTIFY) -c build-support/uncrustify.cfg --replace --no-backup src/*.h src/*.cpp

#:help: build       | Creates a `build` Docker image variant
.PHONY: build
build:
	docker network create nuodb-net || true
	docker build --target build --network nuodb-net -f dockers/slim/Dockerfile -t nuodb/node-nuodb:$(VERSION)-build .

#:help: smoke-tests        | Runs the `test` target, building and testing the driver.
#changed to properly create and mount volumes
.PHONY: smoke-tests
smoke-tests: build
	docker volume create cores
	docker volume create valgrind
	docker run ${TTY} --env-file .env --cap-add=SYS_PTRACE --memory 1g --volume cores:/cores --volume valgrind:/valgrind --name test --rm --network nuodb-net nuodb/node-nuodb:$(VERSION)-build npm run test-smoke

#:help: coverage-smoke        | Runs the `test` target and generates code coverage report.
#changed to properly create and mount volumes
.PHONY: coverage-smoke
coverage-smoke: build
	docker volume create cores
	docker volume create valgrind
	docker run ${TTY} --env-file .env --cap-add=SYS_PTRACE --memory 1g --volume cores:/cores --volume valgrind:/valgrind --volume $(shell pwd)/coverage:/coverage --name test --rm --network nuodb-net nuodb/node-nuodb:$(VERSION)-build npm run coverage-smoke

#:help: this-coverage        | Runs the `test` target and generates code coverage report.
#changed to properly create and mount volumes
.PHONY: this-coverage
this-coverage: build
	docker volume create cores
	docker volume create valgrind
	docker run ${TTY} --env-file .env --cap-add=SYS_PTRACE --memory 1g --volume cores:/cores --volume valgrind:/valgrind --volume $(shell pwd)/coverage:/coverage --name test --rm --network nuodb-net nuodb/node-nuodb:$(VERSION)-build npm run this-coverage

#:help: nightly-tests        | Runs the `test-nightly` target which takes longer to run.
.PHONY: nightly-tests
nightly-tests: build
	docker volume create cores
	docker volume create valgrind
	docker run ${TTY} --env-file .env --cap-add=SYS_PTRACE --memory 1g --volume cores:/cores --volume valgrind:/valgrind --name test --rm --network nuodb-net nuodb/node-nuodb:$(VERSION)-build npm run test-nightly

#:help: all-tests   | Runs both smoke-tests and nightly-tests
.PHONY: all-tests
all-tests: build
	docker volume create cores
	docker volume create valgrind
	docker run ${TTY} --env-file .env --cap-add=SYS_PTRACE --memory 1g --volume cores:/cores --volume valgrind:/valgrind --name test --rm --network nuodb-net nuodb/node-nuodb:$(VERSION)-build npm run test

#:help: test-only   | Runs the `test` target, testing the driver without building the Docker.
.PHONY: test-only
test-only:
	docker volume create cores
	docker volume create valgrind
	docker run ${TTY} --env-file .env --cap-add=SYS_PTRACE --memory 1g --volume cores:/cores --volume valgrind:/valgrind --name test --rm --network nuodb-net nuodb/node-nuodb:$(VERSION)-build npm run test

#:help: this-test  | Runs a single test file
.PHONY: this-test
this-test: build
	docker volume create cores
	docker volume create valgrind
	docker run ${TTY} --env-file .env --cap-add=SYS_PTRACE --memory 1g --volume cores:/cores --volume valgrind:/valgrind --name test --rm --network nuodb-net nuodb/node-nuodb:$(VERSION)-build npm run this-test $(test) test/shutdown/

#:help: valgrind    | Runs the `valgrind` target, building the driver and running a sample application under valgrind.
.PHONY: valgrind
valgrind: build
	docker volume create cores
	docker volume create valgrind
	docker run ${TTY} --env-file .env --cap-add=SYS_PTRACE --memory 1g --volume cores:/cores --volume valgrind:/valgrind --name test --rm --network nuodb-net nuodb/node-nuodb:$(VERSION)-build npm run valgrind

#:help: run-build   | Runs the `build` Docker variant
.PHONY: run-build
run-build:
	docker run ${TTY} --env-file .env --cap-add=SYS_PTRACE --network nuodb-net --rm nuodb/node-nuodb:$(VERSION)-build bash

#:help: onbuild     | Creates an `ONBUILD` Docker image variant
.PHONY: onbuild
onbuild:
	docker build -f dockers/onbuild/Dockerfile --build-arg VERSION=$(VERSION) -t nuodb/node-nuodb:$(VERSION)-onbuild .

#:help: package     | Creates a `package` Docker image
.PHONY: package
package:
	docker build --target package -f dockers/slim/Dockerfile -t nuodb/node-nuodb:$(VERSION)-package .

#:help: release     | Creates a `release` Docker image
.PHONY: release
release:
	docker build --target release -f dockers/slim/Dockerfile -t nuodb/node-nuodb:$(VERSION)-slim .
	docker build -f dockers/onbuild/Dockerfile --build-arg VERSION=$(VERSION) -t nuodb/node-nuodb:$(VERSION)-onbuild .

#:help: start-clair | Starts clair so we can perform image scans.
.PHONY: start-clair
start-clair:
	docker network create scanning
	docker run -d -p 5432:5432 --net=scanning --rm --name db arminc/clair-db:2017-09-18
	docker run -d -p 6060:6060 --net=scanning --rm --name clair --link db:postgres arminc/clair-local-scan:v2.0.6

#:help: scan        | Runs the `scan` target, scaning the Docker containers.
.PHONY: scan
scan:
	docker run --net=scanning --rm --name=scanner --link=clair:clair \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-v $(CURDIR)/clair-whitelist.yaml:/tmp/clair-whitelist.yaml nuodb/clair-scanner \
		--clair="http://clair:6060" --ip="scanner" \
    --threshold Medium --whitelist /tmp/clair-whitelist.yaml nuodb/node-nuodb:$(VERSION)-slim
	docker run --net=scanning --rm --name=scanner --link=clair:clair \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-v $(CURDIR)/clair-whitelist.yaml:/tmp/clair-whitelist.yaml nuodb/clair-scanner \
		--clair="http://clair:6060" --ip="scanner" \
    --threshold Medium --whitelist /tmp/clair-whitelist.yaml nuodb/node-nuodb:$(VERSION)-onbuild

#:help: stop-clair  | Stops clair so we can perform image scans.
.PHONY: stop-clair
stop-clair:
	docker stop clair
	docker stop db
	docker network rm scanning

#:help: clean       | Cleans up any build artifacts
.PHONY: clean
clean:
	-docker rm $(docker ps --all -q -f status=exited)
	-docker rm $(docker ps --all -q -f status=created)
	-docker rmi -f nuodb/node-nuodb:$(VERSION)-build
	-docker rmi -f nuodb/node-nuodb:$(VERSION)-onbuild
	-docker rmi -f nuodb/node-nuodb:$(VERSION)-slim
	-docker image prune -f
	-rm -fr build node_modules

#:help: up          | Starts up a NuoDB cluster
.PHONY: up
up:
	build-support/scripts/up

#:help: status      | Shows the NuoDB cluster status
.PHONY: status
status:
	build-support/scripts/status

#:help: term        | Opens up a terminal to a running NuoDB cluster
.PHONY: term
term:
	@echo "Welcome to NuoDB"
	@echo ""
	@echo "   To open a SQL prompt run the following command:"
	@echo "      nuosql test@ad1 --user dba --password dba"
	@echo ""
	@echo "   To show what's running in the domain run the following command:"
	@echo "      nuocmd --api-server ad1:8888 show domain"
	@echo ""
	@echo "   To get out the terminal simply type exit."
	@echo ""
	@build-support/scripts/term

#:help: dn          | Stops the NuoDB cluster
.PHONY: dn
dn:
	build-support/scripts/dn

#:help: brute       | Runs the tests until an error occurs
.PHONY: brute
brute:
	./build-support/scripts/brute
