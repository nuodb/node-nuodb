VERSION:=$(shell jq -r .version package.json)
UNCRUSTIFY:=uncrustify
DOCKER:=docker

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
	$(DOCKER) build --target build --network nuodb-net -f dockers/centos/Dockerfile -t nuodb/node-nuodb:$(VERSION)-build .

#:help: test        | Runs the `test` target, building and testing the driver.
.PHONY: test
test: build
	$(DOCKER) run -it --name test --rm --network nuodb-net nuodb/node-nuodb:$(VERSION)-build npm run test

#:help: run-build   | Runs the `build` Docker variant
.PHONY: run-build
run-build:
	$(DOCKER) run -it --network nuodb-net --rm nuodb/node-nuodb:$(VERSION)-build bash

#:help: onbuild     | Creates an `ONBUILD` Docker image variant
.PHONY: onbuild
onbuild:
	$(DOCKER) build -f dockers/onbuild/Dockerfile --build-arg VERSION=$(VERSION) -t nuodb/node-nuodb:$(VERSION)-onbuild .

#:help: example     | Creates an `example` Docker image based upon `ONBUILD`
.PHONY: example
example:
	cd examples/docker/ && $(DOCKER) build --build-arg VERSION=$(VERSION) -t nuodb/node-nuodb:$(VERSION)-example .

#:help: run-example | Runs the `example` Docker variant
.PHONY: run-example
run-example:
	$(DOCKER) run -it --name example --rm --network nuodb-net nuodb/node-nuodb:$(VERSION)-example

#:help: package     | Creates a `package` Docker image
.PHONY: package
package:
	$(DOCKER) build --target package -f dockers/centos/Dockerfile -t nuodb/node-nuodb:$(VERSION)-package .

#:help: release     | Creates a `release` Docker image
.PHONY: release
release:
	$(DOCKER) build --target release -f dockers/centos/Dockerfile -t nuodb/node-nuodb:$(VERSION)-centos .

#:help: clean       | Cleans up any build artifacts
.PHONY: clean
clean:
	@$(DOCKER) rm $(docker ps --all -q -f status=exited) || true
	@$(DOCKER) rmi -f nuodb/node-nuodb:$(VERSION)-build
	@$(DOCKER) rmi -f nuodb/node-nuodb:$(VERSION)-onbuild
	@$(DOCKER) rmi -f nuodb/node-nuodb:$(VERSION)-centos
	@$(DOCKER) rmi -f nuodb/node-nuodb:$(VERSION)-example
	@$(DOCKER) image prune -f
	@rm -fr build node_modules

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
