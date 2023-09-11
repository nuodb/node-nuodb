// Copyright 2023, Dassault Systèmes SE
// All rights reserved.
//
// Redistribution and use permitted under the terms of the 3-clause BSD license.

#ifndef NUOJS_ROWMODE_H
#define NUOJS_ROWMODE_H

namespace NuoJs
{
// RowMode controls how results are returned; results may be returned as an
// Array of Value objects, or as an Object with the keys matching the column
// names.
enum RowMode {
    ROWS_AS_ARRAY, // default
    ROWS_AS_OBJECT
};
}

#endif
