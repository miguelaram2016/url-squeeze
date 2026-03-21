$value = "Ov23livn5ZM9f6xCJmAf"
$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = "npx"
$processInfo.Arguments = "vercel env add AUTH_GITHUB_ID production"
$processInfo.RedirectStandardInput = $true
$processInfo.RedirectStandardOutput = $true
$processInfo.RedirectStandardError = $true
$processInfo.UseShellExecute = $false
$processInfo.CreateNoWindow = $true
$process = New-Object System.Diagnostics.Process
$process.StartInfo = $processInfo
$process.Start() | Out-Null
$process.StandardInput.Write($value)
$process.StandardInput.Close()
$output = $process.StandardOutput.ReadToEnd()
$error = $process.StandardError.ReadToEnd()
$process.WaitForExit()
Write-Host "Output: $output"
Write-Host "Error: $error"
Write-Host "Exit Code: $($process.ExitCode)"
