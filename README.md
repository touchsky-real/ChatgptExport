# ChatGPT Visible Collector

这个方案不需要自动化登录，也不需要 Python 去控制浏览器。

思路是：

1. 你用自己正常登录的浏览器打开 ChatGPT 对话。
2. 把 `chatgpt_collect_visible.js` 粘到浏览器控制台执行。
3. 你手动往下滚动，或者用 `auto_scroll_down.py` 辅助自动滚动。
4. 脚本会把当前已经渲染出来、并且可见的消息自动去重累加。
5. 最后直接导出一个总 Markdown 文件。

## 文件

- `chatgpt_collect_visible.js`
- `auto_scroll_down.py`
  可选的 Windows 滚轮模拟脚本。把焦点放到浏览器后，它会自动往下滚。

## 环境准备

如果只使用浏览器控制台里的 `chatgpt_collect_visible.js`，不需要 Python 环境。

如果要使用 `auto_scroll_down.py` 自动滚动，建议先用 `venv` 创建一个独立环境：

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

这个脚本只使用 Python 标准库，不需要额外 `pip install`。

如果 PowerShell 阻止激活脚本，可以在当前终端临时放开执行策略：

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

退出虚拟环境：

```powershell
deactivate
```

## 使用方法

1. 在正常浏览器里打开目标 ChatGPT 对话。
2. 按 `F12` 打开开发者工具。
3. 切到 `Console`。
4. 把 `chatgpt_collect_visible.js` 全部内容粘进去执行。
5. 右下角会出现一个 `Collector` 面板。

如果你不想一直手动滚轮，也可以配合自动滚动脚本：

```powershell
.\.venv\Scripts\Activate.ps1
python auto_scroll_down.py
```

运行后会先等 3 秒，你把焦点切到浏览器里的 ChatGPT 对话页面即可。
运行过程中按 `Esc` 可以立即停止自动滚动。

## 运行方式

脚本启动后会：

- 自动扫描当前屏幕里可见的 assistant 回答
- 默认把当前屏幕里可见的 user 提问一起导出
- 在你滚动时继续自动扫描
- 对相同消息做去重
- 给已经收集过的消息加蓝色描边，方便你判断进度

## 面板按钮

- `Scan Visible`
  立刻手动扫描一次当前屏幕里的消息。
- `Auto: On/Off`
  开关滚动时的自动扫描。
- `Include user`
  默认开启；关闭后只导出 `assistant`。
- `Download MD`
  下载当前已经累计的 Markdown 文件。
- `Copy All`
  把当前累计的全部内容复制到剪贴板。
- `Close`
  关闭脚本面板；如果当前有尚未下载的已收集内容，会先询问是否下载 Markdown。

## 自动滚动脚本

默认用法：

```powershell
.\.venv\Scripts\Activate.ps1
python auto_scroll_down.py
```

也可以不激活环境，直接调用虚拟环境里的 Python：

```powershell
.\.venv\Scripts\python.exe auto_scroll_down.py
```

常用参数：

```powershell
python auto_scroll_down.py --steps 500 --interval 1.0 --lines 8 --delay 5
```

- `--steps`
  一共滚多少次。
- `--interval`
  每次滚动之间等待多久，单位秒。
- `--lines`
  每次滚动的力度，数值越大滚得越快。
- `--delay`
  启动前等待多久，留给你切换到浏览器窗口。

中途退出：

- 按 `Esc` 可立即停止自动滚动。

## 适合的场景

- 对话太长，页面有懒加载
- 不想走 Playwright / Selenium 自动化登录
- 你愿意自己手动慢慢往下滚

## 注意

- 这个方案依赖“消息已经被渲染到页面里”。如果某些更早的消息还没被前端渲染，脚本也抓不到。
- 所以滚动时建议慢一点，必要时停顿一下，让页面把消息真正加载出来。
- 自动滚动脚本只是在当前激活窗口里发送鼠标滚轮事件，所以运行时请不要切走浏览器。
- 如果 ChatGPT 页面结构后面改了，脚本里的选择器可能需要微调。
- 这个脚本默认会同时收集 `assistant` 回答和 `user` 提问；如果你只想保留回答，可以取消勾选 `Include user`。
- 导出的 Markdown 标题会带角色标记，例如 `## 001 [assistant]`、`## 002 [user]`。

## 建议

如果一条对话特别长，最稳的是：

1. 从较上方开始，慢慢往下滚动。
2. 看到右下角 `Collected` 数字持续增加。
3. 滚完整条对话后，点击 `Download MD`。
