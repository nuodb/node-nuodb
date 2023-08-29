
# Best Practices

## Single Connection vs Connection Pool

While connection pooling offers advantages in managing multiple concurrent connections efficiently, a singular connection might be preferred when dealing with specific use cases that prioritize simplicity, resource optimization, and predictable transactional behavior. 

Maintaining a single connection can reduce the overhead associated with connection establishment and teardown. A singular connection should result in quicker response times and is a more straightforward approach in applications with

- Low to moderate traffic 
- Relatively stable workloads
- Required strict control over transactions
- Required strict control over isolation levels

However, it's crucial to acknowledge that this approach might not be suitable for high-traffic applications where connection pooling shines by distributing the load and enhancing scalability. 

The decision between a singular connection and a connection pool should always be context-dependent, carefully considering factors such as expected traffic, workload volatility, and performance requirements.

## Type Safety

Any `try` `catch` block in which NuoDB resources are created must be followed by a `finally` block in which NuoDB resources are then cleaned up. Attempting to clean up NuoDB resources in a `try` block can lead to NuoDB resources being created and never cleaned up.
