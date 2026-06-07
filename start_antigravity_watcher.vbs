Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
' Run watch_context.cjs in the same directory silently
WshShell.Run "node """ & scriptDir & "\watch_context.cjs""", 0, False
