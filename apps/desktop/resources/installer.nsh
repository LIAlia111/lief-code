!macro customInstall
  !ifndef DO_NOT_CREATE_START_MENU_SHORTCUT
    ${IfNot} ${FileExists} "$newStartMenuLink"
      !insertmacro createMenuDirectory
      CreateShortCut "$newStartMenuLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
      ClearErrors
      WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"
    ${EndIf}
  !endif
!macroend

!macro customUnInstall
  ; Updates also run the uninstaller; they still need the cached installer.
  ${IfNot} ${isUpdated}
    RMDir /r "$LOCALAPPDATA\lief-updater"
  ${EndIf}
!macroend
