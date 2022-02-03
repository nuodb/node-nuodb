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
const toQueryTask = (query,connection) => (data) => (taskComplete) => connection.execute(query,data).then(taskComplete)

//async function to populate the table
const populateTable = (connection) => {
    // map the initial data to a task to innsert the data
    const insertTasks = initData.map(toQueryTask(insertQuery,connection));
    //return a promise to complete the tasks in the insertTasks array in series
    return async.series(insertTasks);
}

// the data will be returned in an array of 2-item arrays of the form [HOURLY_WAGE, ID] to match the updateQuery
const raise = (employee) => [employee.HOURLY_WAGE*1.2,employee.ID];

const giveEmployeesRaises = (connection) => 
    connection.execute(createTableQuery)
        .then( () => populateTable(connection))

        // get the results of a select query
        .then( () => connection.execute(selectQuery))
        .then( (resultSet) => resultSet.getRows())
        .then( (employees) => {
            //process the employee data
            console.log("BEFORE RAISE:");
            console.log(employees);

            // process the results
            const employeeRaises = employees.map(raise);

            // update the table to reflect processed data
            // create the updateTasks
            const updateTasks = employeeRaises.map(toQueryTask(updateQuery,connection));

            //return a promise to complete the tasks in series
            return async.series(updateTasks);
        })
        .then(() => connection.execute(selectQuery))
        .then((resultSet) => resultSet.getRows())
        .then((employees) => {
            // confirm results
            console.log("AFTER RAISE:");
            console.log(employees);
        })
        .then(() => connection.execute(dropTableQuery))
        .then(() => connection.close())

const main = () => {
    //setup driver, connection, create and populate tables for use.
    const driver = new Driver();
    driver.connect(config)
        .then(giveEmployeesRaises)
}

main();
