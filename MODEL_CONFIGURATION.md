# OpenAI Model Configuration Guide

## How to Use GPT-5 Nano

I've updated the script to make the OpenAI model configurable. Here's how to switch to GPT-5 Nano:

### Method 1: Environment Variable (Recommended)

Set the environment variable before running the script:

```bash
# Windows Command Prompt
set OPENAI_MODEL=gpt-5-nano
python main.py

# Windows PowerShell
$env:OPENAI_MODEL="gpt-5-nano"
python main.py

# Linux/macOS
export OPENAI_MODEL=gpt-5-nano
python main.py
```

### Method 2: Edit the Code Directly

In `main.py`, change line 30:
```python
# FROM:
'OPENAI_MODEL': os.getenv('OPENAI_MODEL', 'gpt-4o-mini')

# TO:
'OPENAI_MODEL': os.getenv('OPENAI_MODEL', 'gpt-5-nano')
```

## Available Models (as of 2025)

### GPT-5 Family
- `gpt-5-nano` - Lightweight, fast, cost-effective
- `gpt-5-micro` - Ultra-lightweight variant
- `gpt-5` - Full version (higher cost, better quality)

### GPT-4 Family (Current Default)
- `gpt-4o-mini` - Current default, good balance of cost/performance
- `gpt-4o` - Higher quality, more expensive
- `gpt-4-turbo` - Fast and capable

## GPT-5 Nano Specifications

- **Cost**: ~$0.05 per million input tokens, $0.40 per million output tokens
- **Context Window**: 400,000 tokens
- **Speed**: Optimized for fast responses
- **Best For**: Quick analysis tasks like RMA reason extraction

## Testing the Configuration

Run with verbose mode to see which model is being used:

```bash
python main.py --verbose --dry-run
```

You'll see output like:
```
OpenAI model: gpt-5-nano
OpenAI input text length: 608 characters
OpenAI input preview: TICKET SUBJECT: ...
```

## Model Comparison for RMA Analysis

| Model | Speed | Cost | Quality | Recommended For |
|-------|-------|------|---------|-----------------|
| gpt-5-nano | ⚡⚡⚡ | 💰 | ⭐⭐⭐ | Large volume processing |
| gpt-4o-mini | ⚡⚡ | 💰💰 | ⭐⭐⭐⭐ | Current default (good balance) |
| gpt-4o | ⚡ | 💰💰💰 | ⭐⭐⭐⭐⭐ | High-quality analysis needed |

## Advanced Configuration

You can also adjust the reasoning parameters for GPT-5 models by modifying the payload in the `get_ai_reason()` function:

```python
payload = {
    "model": CONFIG['OPENAI_MODEL'],
    "messages": [...],
    "temperature": 0.2,
    "max_tokens": 100,
    "reasoning_effort": "minimal",  # For faster responses
    "verbosity": "low"              # For concise answers
}
```

**Note**: These advanced parameters may only work with GPT-5 family models.


