
# Best Practices

## Single Connection vs Connection Pool

While connection pooling offers advantages in managing multiple concurrent connections efficiently, a single connection might be preferred when dealing with specific use cases that prioritize simplicity, resource optimization, and predictable transactional behavior. 

Maintaining a single connection can reduce the overhead associated with connection establishment and teardown. A single connection should result in quicker response times and is a more straightforward approach in applications with

- Low to moderate traffic 
- Relatively stable workloads
- Required strict control over transactions
- Required strict control over isolation levels

However, it's crucial to acknowledge that this approach might not be suitable for high-traffic applications where connection pooling shines by distributing the load and enhancing scalability. 

The decision between a single connection and a connection pool should always be context-dependent, carefully considering factors such as expected traffic, workload volatility, and performance requirements.

## Type Safety

The `node-nuodb` driver supports `try/catch`, `callback`, and `Promise` semantics. You should put guard rails that verify the availability of data and catching of any errors that could arise. For tighter type safety, you can deal with error catching at the operation level, rather than catching an errors of any operation within a block.

Any `try` `catch` block in which **NuoDB** resources are created must be followed by a `finally` block in which NuoDB resources are then cleaned up. Attempting to clean up NuoDB resources in a `try` block can lead to NuoDB resources being created and never cleaned up.

## Retrying Operations

Under critical operations, it is recommended to retry operations were they to fail. You could catch the exception, clean-up any operations, and retry the operations. To allow some time margin, increase the time between retries. Here is a retry example:

```js
async function() {
    const driver = new Driver();
    let connection = null;
    let results = null;
    let tries = 1;

    while (tries < 6) {

        await new Promise(resolve => setTimeout(async () => {
            try {
                connection = await driver.connect(config);
                results = await connection.execute("SELECT * FROM SYSTEM.NODE;");
                const rows = await results.getRows();
                // use rows
            
            } catch (err) {
                console.error(err);

            } finally {
                if (results != null) {
                    results.close().catch(err => { console.error(err) });
                }
                if (connection != null) {
                    connection.close().catch(err => { console.error(err) });
                }
                tries++;
                resolve();
            }
        }, 1000 * tries));
    }
}
```