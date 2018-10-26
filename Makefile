.PHONY: all
all: clean release

.PHONY: build
build:
	docker build --target build --network nuodb-net -f dockers/centos/Dockerfile -t nuodb/node-nuodb:3.3.0-build .

.PHONY: test
test: build
	docker run -it --name ntest --rm --network nuodb-net nuodb/node-nuodb:3.3.0-build npm run test

.PHONY: run-build
run-build:
	docker run -it --network nuodb-net --rm nuodb/node-nuodb:3.3.0-build bash

.PHONY: onbuild
onbuild:
	docker build -f dockers/onbuild/Dockerfile -t nuodb/node-nuodb:3.3.0-onbuild .

.PHONY: example
example:
	cd examples/docker/ && docker build -t nuodb/node-nuodb:3.3.0-example .

.PHONY: run-example
run-example:
	docker run -it --name example --rm --network nuodb-net nuodb/node-nuodb:3.3.0-example bash

.PHONY: release
release:
	docker build --target release -f dockers/centos/Dockerfile -t nuodb/node-nuodb:3.3.0-centos .

.PHONY: clean
clean:
	docker rmi -f nuodb/node-nuodb:3.3.0-centos
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
