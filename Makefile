
.PHONY: build
build:
	docker build --network nuodb-net -f dockers/centos/Dockerfile -t nuodb/node-nuodb:3.3.0-centos .

.PHONY: clean
clean:
	docker rmi -f nuodb/node-nuodb:3.3.0-centos
	rm -fr build node_modules
