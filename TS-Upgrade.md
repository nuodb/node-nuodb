# TypeScript Upgrade

## Examples

### Initialize NuoDB Driver
```ts
import { Driver } from 'node-nuodb';

const driver = new Driver();
```

### Initialize connection to NuoDB
```ts
import type { Configuration } from 'node-nuodb';

const config: Configuration = {
    database: 'test',
    user: 'dba',
    password: 'dba'
};
const conn = await driver.connect(config);
```

### Execute a NuoSQL command
```ts
const results: ResultSet|undefined = await conn.execute('select * from system.nodes;');
```

### Get data from results
```ts
const data: Rows|undefined = await results?.getRows(); 
```

### Full example of simple usage
```ts

import { Driver } from 'node-nuodb';
import type { Connection, ResultSet, Rows } from 'node-nuodb';

(() => {
    const driver = new Driver();
    (async () => {
        const conn: Connection = await driver.connect({
            database: 'test',
            user: 'dba',
            password: 'dba'
        });
        const results: ResultSet|undefined = await conn.execute('SELECT * FROM SYSTEM.NODES;');
        const rows: Rows|undefined = await results?.getRows();
        console.log('This is the result of the query =>', rows);
    })()
})()
```

## Discussions

### Simplify Dx

- Why not remove the fact that getRows method has to be called? 
Can add size param in getRows to execute options function. Or can create a proxy method that wraps the two into one.

- Only expose desired methods and attributes of objects (Connection, ResultsSet). Change current types to be prefixed with '_', and then expose public version. 

- Consider adding undefined as union with ResultSet (into ResultSet)

### Change naming convention
- `conn.execute()` to `conn.sql()`     
We could expose both, so that execute can be used as a legacy method, that will be deprecated in a next minor/major update]

- Create other helper methods that are common in other ORMs. I know there are examples in the test folder. This does get into ORM-land, and it may be out of scope of this project; but any ways, just as idea. E.g.: 
    - nuodb.selectAll().from()
    - nuodb.insert
    - nuodb.delete
    - ...

- Add ability to perform multiple sql commands on the fly? And store multiple result sets. E.g.:
    - await nuodb.sql(`
        use system;
        select * from nodes;
    `) 
    OR
    - await nuodb.sqls({
        a: 'use system;',
        b: 'select * from nodes;'
    })   [In this example, the return would be an object with each according key and its result set]
