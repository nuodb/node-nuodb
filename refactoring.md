
- Test 1
    # - new Driver()

    # - driver.connect(config)
            "testingss"
    ##      this._driver.connect(config, extension)
                Running connection form C++
    ###         extension(err, connection)
                    "reached 0"
                    "reached 2" + connection instance = Connection { readonly: false, autoCommit: true }
                    "reached 3"
    ###             Connection.extend(connection, driver)
                    "reached 4"
    ###             callback(null, connection)
    "initializing connection"
    "checking exe =>" typeof connection.execute = function

    #   connection.execute(...)
            "THIS IS A TEST 0"
            "THIS IS A TEST"
            THESE ARE THE ARGS => [SqlStm, [Function: extension]]
    ##      this._execute(...)
                (C++) executing => 2
                <!-- !- "1" (?????) -->
    ###         extension(err, resultSet)
                    EXTENDING THE CONNECTION WITH THE RESULT SET STUFF + typeof ResultSet.extend = function
    ####            ResultSet.extend(resultSet, connection, connection._driver)
                        "VEAMOS RESULTSET" => (ResultSet {}, connection, driver)
    ####            callback(null, resultSet)
    'EXPECTING RESULT =>', results (ResultSet { close: [Function: close], getRows: [Function (anonymous)] })
    #   results.getRows()
    ##          ResultSet.nonBlockingGetRows
                        "1...", numRows, batchSize, callback, args
                        <!--? skipping 2, 3, 4 -->
                        "5... 0 1000 null"
    ###                 loopDefer(...)    
                                LOOP => ... closure: **null**       
    SOMETHING WENT WRONG => TypeError: this._getRows is not a function         