@echo off
set VCPKG_BIN=C:\vcpkg\installed\x64-windows\bin
set RESOURCES_DIR=%~dp0resources

echo Copiando DLLs do FFmpeg para %RESOURCES_DIR%...
copy "%VCPKG_BIN%\avutil-60.dll" "%RESOURCES_DIR%\" /Y
copy "%VCPKG_BIN%\avcodec-62.dll" "%RESOURCES_DIR%\" /Y
copy "%VCPKG_BIN%\avformat-62.dll" "%RESOURCES_DIR%\" /Y
copy "%VCPKG_BIN%\avdevice-62.dll" "%RESOURCES_DIR%\" /Y
copy "%VCPKG_BIN%\swscale-9.dll" "%RESOURCES_DIR%\" /Y
copy "%VCPKG_BIN%\swresample-6.dll" "%RESOURCES_DIR%\" /Y
copy "%VCPKG_BIN%\avfilter-11.dll" "%RESOURCES_DIR%\" /Y
echo Concluido!
