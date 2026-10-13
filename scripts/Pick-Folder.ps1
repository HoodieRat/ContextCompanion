$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Windows.Forms
$dialog=New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description='Select a project or documentation folder'
$dialog.ShowNewFolderButton=$true
try { if($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK){[Console]::Out.WriteLine($dialog.SelectedPath)} }
finally { $dialog.Dispose() }
