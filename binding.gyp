{
  "targets": [
    {
      "target_name": "nuodb",
      "cflags": [
        "-Wall",
        "-Werror",
        "-Wextra",
        "-pedantic"
      ],
      "cflags!": [
        "-fno-exceptions"
      ],
      "cflags_cc": [
        "-Wall",
        "-Werror",
        "-Wextra",
        "-pedantic"
      ],
      "cflags_cc!": [
        "-fno-exceptions",
        "-Wno-overloaded-virtual"
      ],
      "variables": {
        "nuodb_home": "<!(echo ${NUODB_HOME-\"/opt/nuodb\"})"
      },
      "sources": [
        "src/NuoJsAddon.cpp",
        "src/NuoJsConnection.cpp",
        "src/NuoJsContext.cpp",
        "src/NuoJsErrMsg.cpp",
        "src/NuoJsParams.cpp",
        "src/NuoJsResultSet.cpp",
        "src/NuoJsTypes.cpp",
        "src/NuoJsValue.cpp"
      ],
      "include_dirs": [
        "/opt/nuodb/include/",
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "libraries": [
        "-ldl",
        "-lpthread",
        "-Wl,-rpath,<(nuodb_home)/lib64",
        "-L<(nuodb_home)/lib64",
        "-lNuoRemote"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ]
    }
  ]
}
