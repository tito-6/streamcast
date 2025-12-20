try {
    $gitPath = "C:\Program Files\Git\cmd"
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    
    if ($currentPath -notlike "*$gitPath*") {
        $newPath = $currentPath + ";" + $gitPath
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Host "Success: Added Git to User Path."
        Write-Host "Please RESTART your terminal/VSCode for changes to take effect."
    }
    else {
        Write-Host "Git is already in your User Path."
    }
}
catch {
    Write-Error "Failed to update Path: $_"
}
