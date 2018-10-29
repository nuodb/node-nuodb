VERSION:=$(shell jq -r .version package.json)
UNCRUSTIFY:=uncrustify
DOCKER:=docker

.PHONY: version
version:
	@echo $(VERSION)

.PHONY: all
all: clean release

.PHONY: uncrustify
uncrustify:
	$(UNCRUSTIFY) -c build-support/uncrustify.cfg --replace --no-backup src/*.h
	$(UNCRUSTIFY) -c build-support/uncrustify.cfg --replace --no-backup src/*.cpp

.PHONY: build
build:
	$(DOCKER) build --target build --network nuodb-net -f dockers/centos/Dockerfile -t nuodb/node-nuodb:$(VERSION)-build .

.PHONY: test
test: build
	$(DOCKER) run -it --name ntest --rm --network nuodb-net nuodb/node-nuodb:$(VERSION)-build npm run test

.PHONY: run-build
run-build:
	$(DOCKER) run -it --network nuodb-net --rm nuodb/node-nuodb:$(VERSION)-build bash

.PHONY: onbuild
onbuild:
	$(DOCKER) build -f dockers/onbuild/Dockerfile --build-arg VERSION=$(VERSION) -t nuodb/node-nuodb:$(VERSION)-onbuild .

.PHONY: example
example:
	cd examples/docker/ && $(DOCKER) build --build-arg VERSION=$(VERSION) -t nuodb/node-nuodb:$(VERSION)-example .

.PHONY: run-example
run-example:
	$(DOCKER) run -it --name example --rm --network nuodb-net nuodb/node-nuodb:$(VERSION)-example

.PHONY: release
release:
	$(DOCKER) build --target release -f dockers/centos/Dockerfile -t nuodb/node-nuodb:$(VERSION)-centos .

.PHONY: clean
clean:
	$(DOCKER) rmi -f nuodb/node-nuodb:$(VERSION)-build
	$(DOCKER) rmi -f nuodb/node-nuodb:$(VERSION)-onbuild
	$(DOCKER) rmi -f nuodb/node-nuodb:$(VERSION)-centos
	$(DOCKER) rmi -f nuodb/node-nuodb:$(VERSION)-example
	rm -fr build node_modules
	$(DOCKER) rm $(docker ps --all -q -f status=exited)
	$(DOCKER) image prune -y

.PHONY: up
up:
	build-support/scripts/up

.PHONY: status
status:
	build-support/scripts/status

.PHONY: dn
dn:
	build-support/scripts/dn
