{
  "target_defaults": {
    "sources": [
      "src/NuoJsAddon.cpp",
      "src/NuoJsConnection.cpp",
      "src/NuoJsDriver.cpp",
      "src/NuoJsErrMsg.cpp",
      "src/NuoJsJson.cpp",
      "src/NuoJsNan.cpp",
      "src/NuoJsNanDate.cpp",
      "src/NuoJsOptions.cpp",
      "src/NuoJsParams.cpp",
      "src/NuoJsResultSet.cpp",
      "src/NuoJsTypes.cpp",
      "src/NuoJsValue.cpp"
    ]
  },
  "targets": [
    {
      "target_name": "nuodb",
      "cflags!": [
        "-fno-exceptions"
      ],
      "cflags_cc!": [
        "-fno-exceptions",
        "-Wno-overloaded-virtual"
      ],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "10.7"
      },
      "cflags": [
        "-g",
        "-Wall",
        "-Werror",
        "-Wextra",
        "-Wno-cast-function-type"
      ],
      "cflags_cc": [
        "-g",
        "-Wall",
        "-Werror",
        "-Wextra",
        "-std=c++17"
      ],
      "variables": {
        "nuodb_client_package": "<!(echo ${NUODB_CLIENT_PACKAGE:-${NUODB_HOME:-\"/opt/nuodb\"}})"
      },
      "include_dirs": [
        "src",
        "<(nuodb_client_package)/include/",
        "<!(node -e \"require('nan')\")"
      ],
      "libraries": [
        "-g",
        "-ldl",
        "-lpthread",
        "-Wl,-rpath,<(nuodb_client_package)/lib64",
        "-L<(nuodb_client_package)/lib64",
        "-lNuoRemote"
      ]
    }
  ]
}
