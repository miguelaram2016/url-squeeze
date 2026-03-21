# PowerShell script to add Vercel env vars without newlines
param(
    [string]$Key,
    [string]$Value,
    [string]$Target = "production"
)

$process = Start-Process -FilePath "npx" -ArgumentList "vercel","env","add",$Key,$Target -NoNewWindow -Wait -PassThru -RedirectStandardInput "env_input.txt" -RedirectStandardOutput "env_output.txt" -RedirectStandardError "env_error.txt"

# Write the value without newline
[System.IO.File]::WriteAllText("$PWD\env_input.txt", $Value)
