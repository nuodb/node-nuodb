#ifndef NUOJS_VALUE_H
#define NUOJS_VALUE_H

#include <stdint.h>
#include <string>

namespace NuoJs
{
class SqlValue
{
public:
    SqlValue();
    SqlValue(const SqlValue& rhs);

    std::string getName() const;
    void setName(std::string);

    int getSqlType() const;
    void setSqlType(int sqlType);

    bool getBoolean() const;
    void setBoolean(bool value);

    float getFloat() const;
    void setFloat(float value);

    double getDouble() const;
    void setDouble(double value);

    int8_t getByte() const;
    void setByte(int8_t value);

    int16_t getShort() const;
    void setShort(int16_t value);

    int32_t getInt() const;
    void setInt(int32_t value);

    int64_t getLong() const;
    void setLong(int64_t value);

    std::string getString() const;
    void setString(std::string value);

private:
    std::string name;

    int sqlType;

    union
    {
        bool b;
        int8_t i8;
        int16_t i16;
        int32_t i32;
        int64_t i64;
        float f4;
        double f8;
    } u;
    std::string s;
};

std::string int64ToString(int64_t v);
} // namespace NuoJs

#endif
