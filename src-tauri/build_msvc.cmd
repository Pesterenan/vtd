@echo off
cd /d "%~dp0"
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"

set VCPKG_ROOT=C:\vcpkg
set LIBCLANG_PATH=C:\Program Files\LLVM\bin
set BINDGEN_EXTRA_CLANG_ARGS=-IC:\vcpkg\installed\x64-windows\include

set PATH=C:\Program Files\CMake\bin;C:\ProgramData\chocolatey\bin;C:\Program Files\LLVM\bin;%VCPKG_ROOT%;%LIBCLANG_PATH%;%PATH%

cargo build --release
