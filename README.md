# Eddie's Portfolio Website

一个现代化的个人作品集网站，采用响应式设计、视差滚动效果、视频背景和双语内容（中文/英文）。这个作品集展示了Eddie 的研究、项目和个人生活的专门页面。

🌐 **在线访问**: [www.open-david.com](https://www.open-david.com)

## 项目概述

这是一个纯前端的个人作品集网站，以诗意的方式呈现个人的学术研究、创意项目和生活哲学。网站采用现代Web技术构建，具有沉浸式的用户体验。

## 项目结构

```
├── assets/
│   ├── images/         # 图像资源
│   │   └── favicon.ico # 网站图标
│   ├── videos/         # 视频背景
│   │   ├── research_background.mp4  # 研究页面背景视频
│   │   ├── project_background.mp4   # 项目页面背景视频
│   │   └── life_background.mp4      # 生活页面背景视频
│   ├── css/           # 样式表
│   │   ├── main.css        # 主要样式
│   │   ├── reset.css       # CSS重置
│   │   └── animations.css  # 动画样式
│   └── js/            # JavaScript文件
│       ├── scroll.js  # 滚动处理
│       └── main.js    # 主要功能
├── research/          # 研究内容目录
│   ├── agent.html     # 智能体研究
│   └── behavior_tree.html  # 行为树研究
├── project/           # 项目内容目录
├── life/              # 生活内容目录
├── index.html         # 主页 - 过去、现在、未来三个章节
├── research.html      # 研究展示页面
├── project.html       # 项目展示页面
├── life.html          # 个人生活展示页面
├── CNAME              # GitHub Pages域名配置
└── README.md          # 项目文档
```

## 核心功能

### 🎨 视觉设计
- **响应式设计** - 适配所有设备和屏幕尺寸
- **视差滚动效果** - 平滑的滚动动画和视觉层次
- **视频背景** - 沉浸式的全屏视频背景，支持自动播放
- **CSS动画** - 内容出现动画和悬停效果
- **动态头部** - 滚动时头部透明度变化

### 🌍 多语言支持
- **双语内容** - 中文/英文对照展示
- **文化融合** - 结合中西方表达方式的诗意内容

### 📱 用户体验
- **直觉导航** - 下拉菜单和章节导航
- **现代UI** - 优雅的字体设计和艺术签名
- **社交媒体集成** - Instagram、TikTok、LinkedIn等平台链接

## 页面详情

### 🏠 主页 (index.html)
展示三个核心主题，每个都有独特的诗意表达：

- **过去 (Past)** - "回忆如诗，经历如画"
  - 回顾个人成长历程和重要经历
  - 体现从过往中汲取营养的人生哲学

- **现在 (Present)** - "此刻如歌，当下如舞" 
  - 展现当前的创作状态和热情
  - 强调艺术表达和创意实现

- **未来 (Future)** - "梦想如星，愿景如海"
  - 描绘未来的可能性和创新方向
  - 表达跨越边界、融合创新的愿景

### 🔬 研究页面 (research.html)
- **学术展示** - 研究成果、论文和学术思考
- **研究领域**:
  - Agent (智能体) - 人工智能代理研究
  - Behavior Tree (行为树) - 行为建模与决策系统
- **沉浸式体验** - 全页面视频背景营造学术氛围

### 💼 项目页面 (project.html)
- **作品集展示** - 创意和技术项目的视觉画廊
- **项目描述** - 详细的工作说明和技术细节
- **创作过程** - 展现创意过程的动态视频背景

### 🌱 生活页面 (life.html)
- **个人洞察** - 兴趣爱好、生活方式和人生哲学
- **个人旅程** - 生活中的思考和感悟
- **生活瞬间** - 展现个人时刻的动态背景

## 技术架构

### 前端技术栈
- **HTML5** - 语义化标记和现代Web标准
- **CSS3** - Flexbox布局、动画和视觉效果
- **Vanilla JavaScript** - 模块化的原生JavaScript
- **Font Awesome** - 社交媒体图标库

### CSS架构
- `reset.css` - 浏览器样式重置和基础样式
- `main.css` - 主要样式包括：
  - 布局和定位系统
  - 排版和颜色方案
  - 组件特定样式
- `animations.css` - 动画相关样式：
  - 滚动过渡效果
  - 悬停交互动画
  - 内容显示动画

### JavaScript模块
- `scroll.js` - 滚动处理：
  - 视差滚动效果实现
  - 页面区域可见性检测
  - 头部透明度动态调整
- `main.js` - 主要功能：
  - 事件监听器管理
  - 导航处理逻辑
  - 页面初始化配置

## 部署和开发

### 🚀 在线部署
- **GitHub Pages** - 托管在GitHub Pages上
- **自定义域名** - 通过CNAME文件配置为 `www.open-david.com`
- **自动部署** - 推送到main分支后自动更新

### 💻 本地开发
```bash
# 克隆仓库
git clone https://github.com/username/nudt-eddie.github.io.git

# 进入项目目录
cd nudt-eddie.github.io

# 无需构建过程 - 直接在浏览器中打开
# 推荐使用本地服务器（如Live Server）来避免CORS问题
```

### 🔧 开发要求
- **无构建依赖** - 纯HTML/CSS/JavaScript，无需打包工具
- **现代浏览器支持**:
  - Chrome (最新版)
  - Firefox (最新版)  
  - Safari (最新版)
  - Edge (最新版)

## 内容管理

### 添加新研究内容
1. 在 `research/` 目录下创建新的HTML文件
2. 在 `research.html` 的研究目录中添加链接
3. 遵循现有的双语内容格式

### 更新视频背景
1. 将新视频文件放置在 `assets/videos/` 目录
2. 更新相应页面的video标签source属性
3. 建议视频格式：MP4，优化文件大小以提升加载速度

## 联系方式

通过以下平台与Eddie连接：
- 📧 联系邮箱：[通过网站联系表单]
- 🌐 个人网站：[www.open-david.com](https://www.open-david.com)
- 📱 社交媒体：Instagram、TikTok、LinkedIn、Facebook、YouTube

---

**© 2025 Eddie's Artistic Portfolio — Crafting Digital Experiences**
