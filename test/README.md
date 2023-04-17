# Test node-nuodb

## 1. Preparations

1.1 Create a working directory

1.2 Clone node-nuodb from Github

1.3 Build

1.4 Configure database credentials

1.5 Set NODE_PATH

2. Run tests

2.1 Run complete test suite

```
make test
```

2.2 Run specified test(s)

For example, to run the timestamp tests, first open the build terminal:

```
make run-build
```

Then run the test:

```
node_modules/.bin/mocha -g '26. typeTimestamp'
```

3. Add tests

- Add negative test to check closing multiple times, produces specific error message.

4. Troubleshooting

5. Debugging tests
