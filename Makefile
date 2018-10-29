VERSION:=$(shell jq -r .version package.json)

.PHONY: version
version:
	@echo $(VERSION)

.PHONY: all
all: clean release

.PHONY: uncrustify
uncrustify:
	uncrustify -c build-support/uncrustify.cfg --replace --no-backup src/*.h
	uncrustify -c build-support/uncrustify.cfg --replace --no-backup src/*.cpp

.PHONY: build
build:
	docker build --target build --network nuodb-net -f dockers/centos/Dockerfile -t nuodb/node-nuodb:$(VERSION)-build .

.PHONY: test
test: build
	docker run -it --name ntest --rm --network nuodb-net nuodb/node-nuodb:$(VERSION)-build npm run test

.PHONY: run-build
run-build:
	docker run -it --network nuodb-net --rm nuodb/node-nuodb:$(VERSION)-build bash

.PHONY: onbuild
onbuild:
	docker build -f dockers/onbuild/Dockerfile --build-arg VERSION=$(VERSION) -t nuodb/node-nuodb:$(VERSION)-onbuild .

.PHONY: example
example:
	cd examples/docker/ && docker build --build-arg VERSION=$(VERSION) -t nuodb/node-nuodb:$(VERSION)-example .

.PHONY: run-example
run-example:
	docker run -it --name example --rm --network nuodb-net nuodb/node-nuodb:$(VERSION)-example

.PHONY: release
release:
	docker build --target release -f dockers/centos/Dockerfile -t nuodb/node-nuodb:$(VERSION)-centos .

.PHONY: clean
clean:
	docker rmi -f nuodb/node-nuodb:$(VERSION)-build
	docker rmi -f nuodb/node-nuodb:$(VERSION)-onbuild
	docker rmi -f nuodb/node-nuodb:$(VERSION)-centos
	docker rmi -f nuodb/node-nuodb:$(VERSION)-example
	rm -fr build node_modules
	docker rm $(docker ps --all -q -f status=exited)
	docker image prune -y

.PHONY: up
up:
	build-support/scripts/up

.PHONY: status
status:
	build-support/scripts/status

.PHONY: dn
dn:
	build-support/scripts/dn
