#include "NuoJsContext.h"

namespace NuoJs
{
Context::Context() :
    rowMode(RowMode::ROWS_AS_OBJECT),
    connection(nullptr),
    connectionIsOpen(false),
    statement(nullptr),
    statementIsOpen(false),
    result(nullptr),
    resultIsOpen(false)
{}

Context::Context(const Context& c) :
    params(c.params),
    rowMode(c.rowMode),
    connection(nullptr),
    connectionIsOpen(c.connectionIsOpen),
    statement(nullptr),
    statementIsOpen(c.statementIsOpen),
    result(nullptr),
    resultIsOpen(c.resultIsOpen)
{
    if (c.connection != nullptr) {
        connection = c.connection;
        connection->addRef();
    }
    if (c.statement != nullptr) {
        statement = c.statement;
        statement->addRef();
    }
    if (c.result != nullptr) {
        result = c.result;
        result->addRef();
    }
}

Context::~Context()
{
    if (resultIsOpen || result != nullptr) {
        resultIsOpen = false;
        if (result != nullptr) {
            result->release();
            result = nullptr;
        }
    }
    if (statementIsOpen || statement != nullptr) {
        statementIsOpen = false;
        if (statement != nullptr) {
            statement->release();
            statement = nullptr;
        }
    }
    if (connectionIsOpen || connection != nullptr) {
        connectionIsOpen = false;
        if (connection != nullptr) {
            connection->release();
            connection = nullptr;
        }
    }
}

Params Context::getParams() const
{
    return params;
}
void Context::setParams(const Params& p)
{
    params = p;
}

RowMode Context::getRowMode() const
{
    return rowMode;
}
void Context::setRowMode(RowMode rm)
{
    rowMode = rm;
}

NuoDB::Connection* Context::getConnection() const
{
    return connection;
}
void Context::setConnection(NuoDB::Connection* c)
{
    if (connection != nullptr) {
        connection->release();
    }
    connection = c;
    connection->addRef();
}

bool Context::isConnectionOpen() const
{
    return connectionIsOpen;
}
void Context::setIsConnectionOpen(bool b)
{
    connectionIsOpen = b;
}

NuoDB::PreparedStatement* Context::getStatement() const
{
    return statement;
}
void Context::setStatement(NuoDB::PreparedStatement* s)
{
    if (statement != nullptr) {
        statement->release();
    }
    statement = s;
    statement->addRef();
}

bool Context::isStatementOpen() const
{
    return statementIsOpen;
}
void Context::setIsStatementOpen(bool b)
{
    statementIsOpen = b;
}

NuoDB::ResultSet* Context::getResultSet() const
{
    return result;
}
void Context::setResultSet(NuoDB::ResultSet* r)
{
    if (result != nullptr) {
        result->release();
    }
    result = r;
    result->addRef();
}

bool Context::isResultSetOpen() const
{
    return resultIsOpen;
}
void Context::setIsResultSetOpen(bool b)
{
    resultIsOpen = b;
}

size_t Context::getFetchSize() const
{
    return fetchSize;
}
void Context::setFetchSize(size_t size)
{
    fetchSize = size;
}

size_t Context::getRowsFetched() const
{
    return rows.size();
}

void Context::pushRow(std::vector<SqlValue> row)
{
    rows.push_back(row);
}

std::vector<SqlValue> Context::popRow()
{
    std::vector<SqlValue> row = rows.back();
    rows.pop_back();
    return row;
}
}
