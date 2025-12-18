$target = "localhost"
$source = "192.168.1.171"
$files = Get-ChildItem -Path d:\streamcast -Recurse -Include *.tsx, *.ts, *.go

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw
        if ($null -eq $content) { continue }
        
        $newContent = $content -replace $source, $target
        
        if ($content -ne $newContent) {
            Set-Content $file.FullName $newContent
            Write-Host "Reverted $($file.Name)"
        }
    }
    catch {
        Write-Host "Failed to read $($file.Name): $_"
    }
}
