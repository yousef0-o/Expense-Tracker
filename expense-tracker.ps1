param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ScriptArgs
)

& node "$PSScriptRoot/bin/expense-tracker.js" @ScriptArgs
