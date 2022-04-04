class ShardMultiplexerValidationError extends Error {
    constructor(msg){
        super(msg);
        this.name = 'ShardMultiplexerValidationError';
    }
}

class ShardMultiplexerNotFoundError extends Error {
    constructor(msg) {
        super(msg);
        this.name = 'ShardMultiplexerNotFoundError';
    }
}

class ShardMultiplexer {
    _requiredInitialArguments = ["shards", "shardMapper"];
    shards = {};
    pollResult;
    shardMapper;

    /**
     * 
     * @param {Object} args
     * @param {Function} args.shardMapper - A function that takes in arguments and returns an identifier for the shards object
     *                                     The first argument is a this argument referencing the current multiplexer object
     * @param {Object[]} args.shards - A list of objects of the form {id: any, pool_config: Driver.ConnectionPool.Config}
     * @param {Function} poll - A function executed at interval pollInterval, accepting on argument which is the "this" argument for the multiplexer.
     * @param {Number} pollInterval - the interval in ms that the poll function should be executed.
     * 
     */
    constructor(args) {
        this._requiredInitialArguments.forEach( 
            r => {
                if(!r in args){
                    throw new ShardMultiplexerValidationError(`Cannot find argument ${r} in constructor arguments`);
                } 
        })
        this.shardMapper = args.shardMapper;
        args.shards.forEach(this.commissionPool);

        if(ShardMultiplexer._pollIntervalIsValid(args.pollInterval)
            && ShardMultiplexer._pollIsValid(args.poll)
        ) {
            this.poll = args.poll;
            this.pollInterval = args.pollInterval;
            this._pollAndSetTimer();
        }
    }

    static _pollIsValid(p){
        // this could potentially b
        return p instanceof Function;
    }
    static _pollIntervalIsValid(pi) {
        return Number.isSafeInteger(pi) && pi > 0;
    }

    /**
     * Call the poll function, and start/continue the cadence for polling
     */
    async _pollAndSetTimer() {
        this._pollResult = await this.poll(this);
        this.pollTimer = setTimeout(this._pollAndSetTimer,this.pollInterval);
    }

    get pollResult() {
        return this._pollResult;
    }
    
    set pollResult(any){
        throw new Error("The poll result can only be set by the ShardMultiplexer internal functions.");
    }

    get pollInterval() {
        return this.pollInterval;
    }

    set pollInterval(interval){
        if(!ShardMultiplexer._pollIntervalIsValid(interval)
            || !ShardMultiplexer._pollIsValid(this.poll)
        ){
            throw new ShardMultiplexerValidationError(`The poll interval ${interval} is invalid, or there is no poll function set.`);
        }
        this.pollInterval = interval;

        // clear the old interval, and start with the new interval
        clearTimeout(this.pollTimer);
        this.pollTimer = setTimeout(this._pollAndSetTimer, this.pollInterval);
    }

    get poll() {
        return this.poll;
    }

    set poll(p) {
        if(!ShardMultiplexer._pollIsValid(p)){
            throw new ShardMultiplexerValidationError("The poll attribute must be a valid function.");
        }

        // We don't need to clear the old interval, because the timeout references a wrapper which calls this.poll
        this.poll = p;
    }

    /**
     * Remove the multiplexer's tracking of the shard, and gracefully close its pool 
     * @param {String | Number} id -- an identifier for the shard to decommission
     */
    async decommissionShard(id) {
        // ?         How should we be handling pools with a connection out there?
        const shard = this.shards[id];
        if(!shard){
            throw new ShardMultiplexerNotFoundError(`Cannot find shard with id ${id}`);
        }

        await this.shards[id].pool.close();
        this.shards[id] = undefined;
    }

    /**
     * Create a new shard, with a matching pool object
     * @param {Object} shard -- an object describing the shard to commission a pool for
     * @param {String | Number} shard.id -- an identifier for the shard
     * @param {Object} shard.config -- a configuration to be passed to the connection pool
     */
    async commissionShard(shard) {
        if(this.shards[shard.id]?.pool){
            throw new ShardMultiplexerValidationError(`There is already a shard commissioned with this id`);
        }
        // create the pool
        const shardPool = await new Pool(shard.pool_config);

        // destructured assign and add the pool in
        this.shards[shard.id] = {...shard, pool: shardPool, activeConnections: []};
    }

    /**
     * 
     * @param {Object} connection -- a connection object, requested from a pool via the multiplexer
     * @param {String | Number} conneciton.shardId -- the shard id the denotes which shard the connection object came from (assigned by the multiplexer)
     */
    async releaseConnection(connection) {
        // ? What happens if the pool for this connection no longer exists?
        const shard = this.shards[connection?.shardId];
        if(!shard){
            throw new ShardMultiplexerNotFoundError(`Cannot find associated shard for connection with shard id ${connection?.shardId}`);
        }
                
        // The connection's shard has been found, we can release the connection back to the pool 
        await shard.pool.releaseConnection(connection);
    }

    /**
     * 
     * @param {any} args -- Arguments matching the arguments as defined by the user during multiplexer initialization in the supplied shardMapper function
     * @returns -- A connection object, with a shard id attribute.
     */
    async requestConnection(args) {
        const shardId = this.shardMapper(...args);
        const pool = this.shards[shardId]?.pool;

        if(pool === undefined){
            throw new ShardMultiplexerNotFoundError(`shardMapper returned shard id ${shardId}, which does not exist or has no associated connection pool`);
        }

        const connection = await pool.requestConnection();
        connection.shardId = shardId;
        return connection;
    }
}