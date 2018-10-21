# node-nuodb 3.3.0 Documentation for the NuoDB Database Node.js Add-on

## Contents

## <a name="intro"/> Introduction

## <a name="errors"/>Errors

## Database class

### Methods

#### database.connect()

##### Prototype

Callback:

```javascript
connect([Object connAttrs], function(Error error, Connection conn){});
```

Promise:

```javascript
promise = connect([Object connAttrs]);
```

##### Description:

Opens a non-pooled connection.