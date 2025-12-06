@echo off
echo Freeing backend service ports...
powershell -Command "$ports = @(3000, 3001, 3002, 3003, 3004); foreach ($p in $ports) { $conn = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue; if ($conn) { $processId = $conn.OwningProcess; Write-Host \"Killing process on port $p (PID: $processId)\"; Stop-Process -Id $processId -Force; Write-Host \"  Done\" } else { Write-Host \"Port $p is already free\" } }"
echo.
echo Ports should now be free. You can start the services.
pause
