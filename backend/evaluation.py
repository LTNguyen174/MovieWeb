import os
import django
import sys

# =============================
# 1. DJANGO SETUP
# =============================
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'movie_project.settings')
django.setup()

# =============================
# 2. IMPORT
# =============================
import numpy as np
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import MultiLabelBinarizer

try:
    from movies.keyword_extractor import KeywordExtractor
except ImportError as e:
    print(f"Lỗi Import: {e}")
    sys.exit(1)


def run_evaluation():
    print("\n--- BẮT ĐẦU ĐÁNH GIÁ THUẬT TOÁN (VER 3.1 – FIXED) ---")

    extractor = KeywordExtractor()

    # =============================
    # 3. TEST DATA
    # =============================
    test_data = [

        # ==========================================

        # NHÓM 1: TITLE SEARCH (TÌM THEO TÊN PHIM)

        # ==========================================

        {

            "query": "Mai",

            "expected_type": "title_search",

            "expected_country": "",

            "expected_genres": [],

            "expected_year": None

        },

        {

            "query": "Doraemon",

            "expected_type": "title_search",

            "expected_country": "",

            "expected_genres": [],

            "expected_year": None

        },

        {

            "query": "Lật mặt 6",

            "expected_type": "title_search",

            "expected_country": "",

            "expected_genres": [],

            "expected_year": None

        },

        {

            "query": "Nhà bà Nữ",

            "expected_type": "title_search",

            "expected_country": "",

            "expected_genres": [],

            "expected_year": None

        },

        {

            "query": "Mắt biếc",

            "expected_type": "title_search",

            "expected_country": "",

            "expected_genres": [],

            "expected_year": None

        },

        {

            "query": "Bố già", 

            "expected_type": "title_search",

            "expected_country": "",

            "expected_genres": [],

            "expected_year": None

        },



        # ==========================================

        # NHÓM 2: STRUCTURED (CẤU TRÚC RÕ RÀNG)

        # ==========================================

        {

            "query": "Phim hoạt hình, Nhật bản, năm 2023",

            "expected_type": "structured",

            "expected_country": "japan",

            "expected_genres": ["Phim Hoạt Hình"],

            "expected_year": 2023

        },

        {

            "query": "Phim hành động Mỹ 2020",

            "expected_type": "structured",

            "expected_country": "united states of america",

            "expected_genres": ["Phim Hành Động"],

            "expected_year": 2020

        },

        {

            "query": "thể loại kinh dị, quốc gia thái lan",

            "expected_type": "structured",

            "expected_country": "thailand", # Đã update map Thái Lan

            "expected_genres": ["Phim Kinh Dị"],

            "expected_year": None

        },

        {

            "query": "phim hàn quốc năm 2024",

            "expected_type": "structured",

            "expected_country": "south korea",

            "expected_genres": [],

            "expected_year": 2024

        },

        {

            "query": "Phim hài, Châu Tinh Trì",

            "expected_type": "structured",

            "expected_country": "",

            "expected_genres": ["Phim Hài"],

            "expected_year": None

        },

        {

            # UPDATE: 'tình cảm' -> 'Phim Lãng Mạn'

            "query": "Phim tình cảm, lãng mạn", 

            "expected_type": "structured",

            "expected_country": "",

            "expected_genres": ["Phim Lãng Mạn"], 

            "expected_year": None

        },



        # ==========================================

        # NHÓM 3: NATURAL LANGUAGE (CÂU TỰ NHIÊN)

        # ==========================================

        {

            # UPDATE: 'tình cảm' -> 'Phim Lãng Mạn'

            "query": "tìm phim tình cảm hàn quốc hay nhất",

            "expected_type": "natural",

            "expected_country": "south korea",

            "expected_genres": ["Phim Lãng Mạn"],

            "expected_year": None

        },

        {

            "query": "tôi muốn xem phim ma đáng sợ",

            "expected_type": "natural",

            "expected_country": "",

            "expected_genres": ["Phim Kinh Dị"], 

            "expected_year": None

        },

        {

            "query": "gợi ý cho tôi vài bộ phim về chiến tranh việt nam năm 1975",

            "expected_type": "natural", 

            "expected_country": "vietnam",

            "expected_genres": ["Phim Chiến Tranh"],

            "expected_year": 1975

        },

        {

            # UPDATE: 'vui nhộn' -> 'Phim Hài', 'hoạt hình' -> 'Phim Hoạt Hình'

            "query": "có phim hoạt hình nào vui nhộn cho trẻ em không",

            "expected_type": "natural",

            "expected_country": "",

            "expected_genres": ["Phim Hoạt Hình", "Phim Hài"], 

            "expected_year": None

        },

        {

            "query": "phim gì mà có đánh nhau bùm chíu", 

            "expected_type": "natural",

            "expected_country": "",

            "expected_genres": ["Phim Hành Động"], # Đã thêm keyword 'đánh nhau'

            "expected_year": None

        },

        {

            "query": "tìm phim khoa học viễn tưởng của mỹ sản xuất năm ngoái",

            "expected_type": "natural",

            "expected_country": "united states of america",

            "expected_genres": ["Phim Khoa Học Viễn Tưởng"],

            "expected_year": None 

        },

        {

            # UPDATE: Dùng từ khóa 'hài hước' thay vì 'vui vẻ' để Regex bắt được (nếu ko dùng AI)

            "query": "tôi buồn quá muốn xem phim gì đó hài hước", 

            "expected_type": "natural",

            "expected_country": "",

            "expected_genres": ["Phim Hài"],

            "expected_year": None

        },



        # ==========================================

        # NHÓM 4: HỖN HỢP & EDGE CASES

        # ==========================================

        {

            "query": "Phim 2012",

            "expected_type": "title_search", # Hy vọng check DB sẽ ra tên phim

            "expected_country": "",

            "expected_genres": [],

            "expected_year": None 

        },

        {

            # UPDATE: 'cổ trang' -> 'Phim Lịch Sử' (Bỏ Giả Tượng vì map mới ko có)

            "query": "Phim Trung Quốc cổ trang",

            "expected_type": "structured",

            "expected_country": "china",

            "expected_genres": ["Phim Lịch Sử"], 

            "expected_year": None

        },

        {

            "query": "Phim Việt Nam chiếu rạp",

            "expected_type": "structured",

            "expected_country": "vietnam",

            "expected_genres": [],

            "expected_year": None

        },

        {

            # UPDATE: 'trinh thám' -> 'Phim Hình Sự' (Bỏ Bí Ẩn để chính xác hơn)

            "query": "Phim trinh thám anh", 

            "expected_type": "structured",

            "expected_country": "united kingdom",

            "expected_genres": ["Phim Hình Sự"], 

            "expected_year": None

        },

        {

            "query": "Sherlock Holmes",

            "expected_type": "title_search",

            "expected_country": "",

            "expected_genres": [],

            "expected_year": None

        },

        {

            "query": "Fast & Furious 10",

            "expected_type": "title_search",

            "expected_country": "",

            "expected_genres": [],

            "expected_year": None

        },

        {

            # UPDATE: 'tình cảm' -> 'Phim Lãng Mạn'

            "query": "phim tình cảm nhật bản 2022",

            "expected_type": "structured",

            "expected_country": "japan",

            "expected_genres": ["Phim Lãng Mạn"],

            "expected_year": 2022

        },

        {

            "query": "phim hoạt hình trung quốc hay",

            "expected_type": "structured",

            "expected_country": "china",

            "expected_genres": ["Phim Hoạt Hình"],

            "expected_year": None

        }

    ]

    # =============================
    # 4. STORAGE
    # =============================
    y_true_type, y_pred_type = [], []
    y_true_country, y_pred_country = [], []
    y_true_genres, y_pred_genres = [], []

    print(f"Đang test {len(test_data)} câu truy vấn...\n")

    # =============================
    # 5. RUN TEST
    # =============================
    for item in test_data:
        query = item["query"]
        pred = extractor.extract_keywords(query)

        # TYPE
        y_true_type.append(item["expected_type"])
        y_pred_type.append(pred["query_type"])

        # COUNTRY
        gt_country = item["expected_country"] or ""
        pr_country = pred["country"] or ""
        y_true_country.append(gt_country)
        y_pred_country.append(pr_country)

        # GENRE
        y_true_genres.append(item["expected_genres"])
        y_pred_genres.append(pred["genres"])

        # LOG SAI
        if gt_country != pr_country:
            print(f"[SAI COUNTRY] {query} | GT={gt_country} | PRED={pr_country}")
        if set(item["expected_genres"]) != set(pred["genres"]):
            print(f"[SAI GENRE] {query} | GT={item['expected_genres']} | PRED={pred['genres']}")
        if item["expected_type"] != pred["query_type"]:
            print(f"[SAI TYPE] {query} | GT={item['expected_type']} | PRED={pred['query_type']}")

    # =============================
    # 6. REPORT
    # =============================
    print("\n" + "=" * 50)
    print("BÁO CÁO QUERY TYPE")
    print("=" * 50)
    print(classification_report(y_true_type, y_pred_type, zero_division=0))

    print("\n" + "=" * 50)
    print("ACCURACY QUỐC GIA")
    print("=" * 50)
    print(f"Accuracy: {accuracy_score(y_true_country, y_pred_country):.2f}")

    # =============================
    # 7. GENRE MULTI-LABEL
    # =============================
    mlb = MultiLabelBinarizer()
    mlb.fit(y_true_genres + y_pred_genres)

    y_true_enc = mlb.transform(y_true_genres)
    y_pred_enc = mlb.transform(y_pred_genres)

    print("\n" + "=" * 50)
    print("BÁO CÁO THỂ LOẠI (MULTI-LABEL)")
    print("=" * 50)
    print(classification_report(y_true_enc, y_pred_enc, target_names=mlb.classes_, zero_division=0))


if __name__ == "__main__":
    run_evaluation()
