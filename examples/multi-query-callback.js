// Copyright (c) 2022, NuoDB, Inc.
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

'use strict';

const { Driver } = require('..');
const config = require('../test/config');
const async = require('async');

// table EMPLOYEE
// ID: SMALLINT
// HOURLY_WAGE: DOUBLE

// declare queries
const createTableQuery = 'CREATE TABLE IF NOT EXISTS EMPLOYEE (ID SMALLINT, HOURLY_WAGE DOUBLE);'
const dropTableQuery = 'DROP TABLE IF EXISTS EMPLOYEE;';
const insertQuery = 'INSERT INTO EMPLOYEE (ID, HOURLY_WAGE) VALUES (?, ?);';
const selectQuery = 'SELECT * FROM EMPLOYEE;';
const updateQuery = 'UPDATE EMPLOYEE SET EMPLOYEE.HOURLY_WAGE = (?) WHERE EMPLOYEE.ID = (?);';

//data is an array of 2-item arrays of the form [ID,HOURLY_WAGE] to match the insertQuery
const initData = [[1,15],[2,15.5],[3,16],[4,16.5],[5,17]];

// take in a query and connection object,
// return a function for mapping data to the task of executing a query 
const toQueryTask = (query,connection) => (data) => (taskCompleteCallBack) => connection.execute(query,data,taskCompleteCallBack)

//async function to populate the table
const populateTable = (connection, populateDoneCallBack) => {
    // map the initial data to a task to innsert the data
    const insertTasks = initData.map(toQueryTask(insertQuery,connection));
    //wait for the tasks in the insertTasks array to complete in series
    async.series(insertTasks, populateDoneCallBack);
}

// the data will be returned in an array of 2-item arrays of the form [HOURLY_WAGE, ID] to match the updateQuery
const raise = (employee) => [employee.HOURLY_WAGE*1.2,employee.ID];


const giveEmployeesRaises = (err, connection) => 
    connection.execute(createTableQuery, (err, results) => {
        // table is created
        populateTable(connection, () => {
            //table is populated
            connection.execute(selectQuery, (err, resultSet) => {
                resultSet.getRows((err, employees) => {
                    console.log("AFTER RAISE:");
                    console.log(employees);
                    // process the results
                    const employeeRaises = employees.map(raise);

                    // update the table to reflect processed data
                    // create the updateTasks
                    const updateTasks = employeeRaises
                        .map(toQueryTask(updateQuery,connection));

                    //wait for them all to complete in series
                    async.series(updateTasks, () => {
                        //confirm results
                        connection.execute(selectQuery,(err, resultSet) => {
                            resultSet.getRows((err, employees) => {
                                console.log("AFTER RAISE:");
                                console.log(employees);
                                //clean up
                                connection.execute(dropTableQuery, () => {
                                    connection.close()
                                });
                            });
                        });
                    });
                });
            });
        });
    });

const main = async () => {
    //setup driver, connection
    const driver = new Driver();
    driver.connect(config, giveEmployeesRaises);
}

main();
