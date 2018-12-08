---
title: Transactions
category: Getting Started
order: 5
---

Use options to control commit behavior and isolation level.

> Commit behavior can be configured at the connection or statement level.

## Transaction Boundaries

By default transactions are configured with auto-commit enabled. For more complex
transaction scenarios involving commits involving multiple statements, you must
disable auto-commit, and control the transaction boundaries yourself.

The following shows how to set configure the commit behavior at the connection level,
and manually control transaction boundaries with options to commit or rollback:

```javascript
const { Driver } = require('node-nuodb')

var driver = new Driver();
(async () => {
  const connection = await driver.connect(...)
  try {
    await connection.execute(...)
    await connection.execute(...)
    const connection.commit()
  } catch (e) {
    await connection.rollback()
    throw e
  } finally {
    connection.close()
  }
})().catch(e => console.log(err.stack))

```
