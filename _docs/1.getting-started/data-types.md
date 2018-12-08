---
title: Data Types
category: Getting Started
order: 6
---

NuoDB supports a rich set of data types. However, with Node.js having only a few fundamental
data types, data type mapping must occur from SQL types to types available in Node.js. And
given the overloading of types in Node, there are rules with which approrpriate SQL types are
chosen during inserts.

## Javascript to SQL Mapping

#### Null

The **Null** type in ES is represented as a SQL **NULL**.

#### Boolean

The **Boolean** type in ES is represented as a SQL **BOOLEAN**. True and false have the following
aliases:

| Value  | Aliases     |
|--------| ----------- |
| true   | 1, 'True'   |
| false  | 0, 'False'  |


#### Number

The **Number** type in ES is used to represent all numeric types in Javascript. They are represented
as IEEE Double Precision numbers. The limitation of this approach chosen in Javascript is that
only 53 bits are usable for representing integer numbers; there is NO support in Javascript for
64-bit integers.

Inserts of **Number** types into the database uses the shortest permissible representation:

| Kind | Range      | Mapped SQL Type |
|-------------| ----------- | ----------- |
| Floating Point | per IEEE 32-bit Floating Point | FLOAT |
| Floating Point | per IEEE 64-bit Floating Point | DOUBLE |
| Integer | -32,768 to 32,767 | SMALLINT |
| Integer | -2,147,483,648 to 2,147,483,647  | INT  |
| Integer | -9007199254740990 to 9007199254740990 | BIGINT |
| Integer | -9223372036854775808 to 9223372036854775807 | VARCHAR |
    

#### String

The **String** type in ES is a Unicode string, and is directly representable in SQL as a string type,
or equivalent aliases. ES has no support for single character primitives. ES **String** is represented
as **VARCHAR** SQL types.

#### Date

The **Date** type in ES is used to represent all forms including: date, time, and datetime. ES has
no support for distinct types for each form, whereas other languages, including SQL, do. Because of
conflated concepts for date/time/datetime in ES, the only possible representation for the SQL wire
protocol is **VARCHAR**. All **Date** objects are converted to **VARCHAR** before values are sent to the
database. The types used in the database, however, may be **DATE**, **TIME**, or **TIMESTAMP**;
however, it is the responsibility of the user to make sure that the appropriate values are passed
to the **Driver** according to the following rules:

* Time should be represented with an Epoch Date
* Date should be represented with hours, minutes, seconds, set to zero.

> NuoDB supports timestamps with 9 digits of precision (nanoseconds), but Javascript only supports
> 3 digits of precision (milliseconds). Bear this in mind when reading values from NuoDB with Node.js
> based applications.

## SQL to Javascript Mapping

#### Null Types

The **NULL** type in SQL is represented as an ES **null**.

#### Boolean Types

The **BOOLEAN** type in SQL is represented as an ES **Boolean**.

#### Numeric Types

All **NUMERIC** types in SQL are represented as an ES **Number**, except for 64-bit integers
outside of the range, -9007199254740990 to 9007199254740990, which are represented as **String**.

#### String Types

All **STRING** types in SQL (**STRING**, **VARCHAR**, **NVARCHAR**, etc) are represented as an ES **String**.

#### Date/Time/Timestamp

All **DATE**, **TIME**, **TIMESTAMP** types in SQL are represented as an ES **Date**.

#### Default Type

All other types are represented as an ES **String**.
