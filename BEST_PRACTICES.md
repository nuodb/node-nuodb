
# Best Practices

Any `try` `catch` block in which NuoDB resources are created must be followed by a `finally` block in which NuoDB resources are then cleaned up. Attempting to clean up NuoDB resources in a `try` block can lead to NuoDB resources being created and never cleaned up.

### Good Example

```js
 let conn
 let results
 try {
    conn = await pool.requestConnection();
    results = await conn.execute(query);
    const rows = await results?.getRows();
    rows?.should.be.ok();
  } catch (e) {
    console.error(e);
    should.not.exist(e);
  } finally {
      await results?.close();
      await pool.releaseConnection(conn);
  }
```

### Bad Example

```js
 try {
    const conn = await pool.requestConnection();
    const results = await conn.execute(query); // if we get an error here we will never clean up our connection
    const rows = await results?.getRows();
    rows?.should.be.ok();
    await results?.close();
    await pool.releaseConnection(conn);
  } catch (e) {
    console.error(e);
    should.not.exist(e);
  }
```
