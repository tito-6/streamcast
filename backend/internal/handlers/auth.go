package handlers

import (
	"net/http"
	"streamcast-backend/internal/models"
	"time"

	"github.com/gin-gonic/gin"
)

type LoginInput struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func Login(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := models.DB.Where("username = ?", input.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Verify password (in real app use bcrypt)
	if user.Password != input.Password {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": "mock-jwt-token-" + user.Username})
}

func Seed(c *gin.Context) {
	// 1. Clear Database
	models.DB.Exec("DELETE FROM posts")
	models.DB.Exec("DELETE FROM events")
	models.DB.Exec("DELETE FROM streams")
	models.DB.Exec("DELETE FROM hero_banners")
	models.DB.Exec("DELETE FROM users")

	// Create Admin User
	admin := models.User{Username: "SC_Admin_2025", Password: "Secure_Stream_99$!", Role: "admin"}
	models.DB.FirstOrCreate(&admin, models.User{Username: "SC_Admin_2025"})

	// Create Default Banner
	banner := models.HeroBanner{
		TitleEn:  "Welcome to Sport Events",
		TitleAr:  "مرحباً بكم في Sport Events",
		ImageURL: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80",
		IsActive: true,
	}
	models.DB.Create(&banner)

	// Add Posts
	post1 := models.Post{
		TitleAr: "غياب مؤثر يهدد ريال مدريد أمام إشبيلية",
		ContentAr: `يدخل ريال مدريد مواجهة إشبيلية، مساء غدٍ السبت على ملعب سانتياغو برنابيو، وسط أجواء مشحونة وتحديات متزايدة تفرض نفسها على المدرب تشابي ألونسو، الذي يسعى لإعادة التوازن للفريق في توقيت بالغ الحساسية.

وتلقى الجهاز الفني ضربة محتملة بغياب فيدي فالفيردي، بعدما فشل لاعب الوسط الأوروغوياني في المشاركة بتدريبات الجمعة، عقب غيابه عن مباراة كأس الملك أمام تالافيرا. وأكد النادي أن فالفيردي يعاني من إصابة بالإنفلونزا إلى جانب كدمة قوية في القدم، ما يجعل فرص لحاقه بمواجهة إشبيلية محل شك كبير.

في المقابل، تلقى ألونسو دفعة معنوية بعودة عدد من العناصر المؤثرة إلى التدريبات الجماعية، يتقدمهم ديفيد ألابا، إدواردو كامافينجا، وفيرلاند ميندي، مع آمال كبيرة بتواجدهم ضمن قائمة المباراة. كما عاد المدافع الشاب راؤول أسينسيو بعد تعافيه من الإنفلونزا، إلى جانب الحارس تيبو كورتوا وأنطونيو روديجر اللذين حصلا على راحة خلال مواجهة الكأس.

ورغم هذه العودة الجزئية، يعاني ريال مدريد من غيابات عديدة في آخر مبارياته بالدوري خلال عام 2025، إذ يفتقد خدمات ترينت ألكسندر أرنولد، داني كارفاخال، وإيدير ميليتاو بسبب الإصابة، إضافة إلى كاريراس وإندريك بداعي الإيقاف، بينما يغيب إبراهيم دياز لانضمامه إلى معسكر منتخب المغرب استعدادًا لكأس أمم أفريقيا.

وتأتي هذه المواجهة في توقيت حرج بالنسبة لتشابي ألونسو، الذي يواجه انتقادات متزايدة على خلفية تراجع النتائج، حيث لم يحقق الفريق سوى خمسة انتصارات في آخر 11 مباراة. وتُعد مباراة إشبيلية محطة مفصلية في مسيرة المدرب الإسباني مع النادي، في ظل تصاعد الشكوك حول مستقبله، واحتمالية تعقّد موقفه في حال تعثر الفريق مجددًا.`,
		TitleEn:    "Absence threatens Real Madrid against Sevilla",
		ContentEn:  "Real Madrid faces Sevilla amidst challenges for Xabi Alonso. Fede Valverde might miss the game due to flu and injury.",
		TitleTr:    "Real Madrid, Sevilla maçında eksiklerle mücadele ediyor",
		ContentTr:  "Real Madrid, Xabi Alonso yönetimindeki zorluklarla Sevilla ile karşılaşıyor. Fede Valverde grip ve sakatlık nedeniyle maçı kaçırabilir.",
		ImageURL:   "https://assets.kooora.com/images/v3/getty-2252618795/crop/MM5DKMBQGA5DEOBRGM5G433XMU5DAORSGYYA====/GettyImages-2252618795.jpg?quality=60&auto=webp&format=pjpg&width=980",
		Category:   "Football",
		IsFeatured: true,
	}
	models.DB.Create(&post1)

	post2 := models.Post{
		TitleAr: "“هاجس الرقم واحد”.. القاسم المشترك بين ميسي وكريستيانو",
		ContentAr: `أكد الإسباني ألفارو نيجريدو، مهاجم ريال مدريد السابق، وجود قواسم مشتركة كبيرة بين البرتغالي كريستيانو رونالدو، قائد النصر السعودي، والأرجنتيني ليونيل ميسي، نجم إنتر ميامي الأمريكي، معتبرًا أن عقلية “الرقم واحد” هي جوهر التنافس التاريخي بين النجمين.

وأوضح نيجريدو، في تصريحات نقلها موقع GOAL، أن كريستيانو يشبه ميسي في رغبته الدائمة باعتلاء القمة وعدم الاكتفاء بما تحقق، وهو ما يدفعه للاستمرار في الملاعب رغم تقدمه في السن، مضيفًا: “رونالدو لم يقل كلمته الأخيرة بعد، فما يزال يمتلك أهدافًا يسعى لتحقيقها”.

وأشار المهاجم الإسباني، الذي سبق له خوض تجربة احترافية في الدوري الإماراتي، إلى أن هذا الطموح المتجدد هو السبب الرئيسي وراء استمرار قائد المنتخب البرتغالي في اللعب على أعلى مستوى حتى اليوم.

ميسي يتقدم بخطوة

ويبدو أن ليونيل ميسي سبق غريمه بخطوة على صعيد الإنجازات العالمية، بعدما توّج مع منتخب الأرجنتين بلقب كأس العالم 2022 في قطر، في إنجاز تاريخي عزز مكانته بين أساطير اللعبة، مع ترجيحات بمشاركته في الدفاع عن اللقب خلال مونديال 2026 الذي تستضيفه الولايات المتحدة وكندا والمكسيك.

في المقابل، يتطلع كريستيانو رونالدو لخوض كأس العالم 2026، التي ستكون السادسة في مسيرته الدولية، حيث سيبلغ من العمر 41 عامًا، في محاولة لتحقيق الحلم الوحيد الذي استعصى عليه، وهو التتويج بالمونديال.

ورغم فوزه مع البرتغال بلقب كأس أمم أوروبا، إلى جانب لقبين في دوري الأمم الأوروبية، يبقى كأس العالم القطعة الناقصة في سجل رونالدو الذهبي، ما يفسر إصراره على مواصلة التحدي حتى اللحظة الأخيرة من مسيرته الكروية.`,
		TitleEn:    "The 'Number One' Obsession: The common ground between Messi and Cristiano",
		ContentEn:  "Alvaro Negredo highlights the shared 'number one' mentality between Ronaldo and Messi as the core of their rivalry.",
		TitleTr:    "'Bir Numara' Takıntısı: Messi ve Cristiano arasındaki ortak nokta",
		ContentTr:  "Alvaro Negredo, Ronaldo ve Messi arasındaki rekabetin temelinin 'bir numara' olma zihniyeti olduğunu vurguladı.",
		ImageURL:   "https://assets.kooora.com/images/v3/bltda3789316a2b4fab/GOAL%20-%20Multiple%20Images%20-%202%20Split%20-%20Facebook%20-%202024-09-06T071725.414.png?quality=60&auto=webp&format=pjpg&width=1148",
		Category:   "Special",
		IsFeatured: true,
	}
	models.DB.Create(&post2)

	// Add Events
	event1 := models.Event{
		TitleAr:     "ريال مدريد ضد برشلونة",
		TitleEn:     "Real Madrid vs Barcelona",
		TitleTr:     "Real Madrid vs Barselona",
		Sport:       "Football",
		LeagueAr:    "الدوري الاسباني",
		LeagueEn:    "La Liga",
		LeagueTr:    "La Liga",
		TeamHomeAr:  "ريال مدريد",
		TeamHomeEn:  "Real Madrid",
		TeamHomeTr:  "Real Madrid",
		TeamAwayAr:  "برشلونة",
		TeamAwayEn:  "Barcelona",
		TeamAwayTr:  "Barselona",
		StartTime:   time.Now().Add(24 * time.Hour),
		Venue:       "Santiago Bernabeu",
		Broadcaster: "BeIN Sports",
		Thumbnail:   "https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/1200px-Real_Madrid_CF.svg.png",
	}
	models.DB.Create(&event1)

	c.JSON(http.StatusOK, gin.H{"message": "Database seeded with new content"})
}
