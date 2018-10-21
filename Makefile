
.PHONY: build
build:
	docker build -f dockers/centos/Dockerfile -t nuodb/node-nuodb:3.3.0-centos .

.PHONY: clean
clean:
	rm -fr build node_modules
