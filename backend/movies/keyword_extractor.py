"""
SBERT-based keyword extraction for Vietnamese movie search queries.
Extracts meaningful keywords like genres, countries, and themes from natural language queries.
"""
import re
import numpy as np
from sentence_transformers import SentenceTransformer
from .embeddings import load_embeddings, get_top_k
from .models import Category, Country


class KeywordExtractor:
    """Extract keywords from Vietnamese movie search queries using SBERT and pattern matching"""
    
    def __init__(self):
        self.model_name = "all-MiniLM-L6-v2"
        self.model = None
        self._load_model()
        
        # Vietnamese genre keywords mapping - updated to match database categories
        self.genre_keywords = {
            'Phim Hành Động': ['action', 'hanh dong', 'hành động', 'hanh dong', 'Phim Hành Động'],
            'Phim Hình Sự': ['crime', 'hinh su', 'hình sự', 'trinh tham', 'trinh thám', 'Phim Hình Sự'],
            'Phim Tình Cảm': ['romance', 'tinh cam', 'tình cảm', 'tình yêu', 'yeu', 'Phim Tình Cảm'],
            'Phim Lãng Mạn': ['romance', 'lang man', 'lãng mạn', 'tình cảm', 'tình yêu', 'Phim Lãng Mạn'],
            'Phim Kinh Dị': ['horror', 'kinh di', 'kinh dị', 'rung ron', 'rùng rợn', 'Phim Kinh Dị'],
            'Phim Hài': ['comedy', 'hai huoc', 'hài hước', 'hài', 'Phim Hài'],
            'Phim Hoạt Hình': ['animation', 'hoat hinh', 'hoạt hình', 'cartoon', 'phim hoat hinh', 'Phim Hoạt Hình'],
            'Phim Phiêu Lưu': ['adventure', 'phieu luu', 'phiêu lưu', 'Phim Phiêu Lưu'],
            'Phim Khoa Học Viễn Tưởng': ['sci-fi', 'science fiction', 'khoa hoc vien tuong', 'khoa học viễn tưởng', 'Phim Khoa Học Viễn Tưởng'],
            'Phim Gia Đình': ['family', 'gia dinh', 'gia đình', 'Phim Gia Đình'],
            'Phim Chiến Tranh': ['war', 'chien tranh', 'chiến tranh', 'Phim Chiến Tranh'],
            'Phim Thể Thao': ['sports', 'the thao', 'thể thao', 'Phim Thể Thao'],
            'Phim Nhạc': ['music', 'am nhac', 'âm nhạc', 'musical', 'Phim Nhạc'],
            'Phim Tài Liệu': ['documentary', 'tai lieu', 'tài liệu', 'Phim Tài Liệu'],
            'Phim Chính Kịch': ['drama', 'chinh kich', 'chính kịch', 'Phim Chính Kịch'],
            'Phim Lịch Sử': ['history', 'lich su', 'lịch sử', 'Phim Lịch Sử'],
            'Phim Bí Ẩn': ['mystery', 'bi an', 'bí ẩn', 'Phim Bí Ẩn'],
            'Phim Gây Cấn': ['thriller', 'giat gan', 'giật gân', 'gây cấn', 'Phim Gây Cấn'],
            'Phim Giả Tượng': ['fantasy', 'gia tuong', 'giả tưởng', 'Phim Giả Tượng'],
            'Phim Miền Tây': ['western', 'mien tay', 'miền tây', 'Phim Miền Tây'],
        }
        
        # Country name mappings - updated to match database country names
        self.country_mappings = {
            'mỹ': ['united states of america', 'usa', 'america', 'united states'],
            'việt nam': ['vietnam', 'vn'],
            'nhật bản': ['japan', 'japanese'],
            'hàn quốc': ['south korea', 'korea'],
            'trung quốc': ['china', 'chinese'],
            'anh': ['united kingdom', 'uk', 'britain'],
            'pháp': ['france', 'french'],
            'đức': ['germany', 'german'],
            'ý': ['italy', 'italian'],
            'tây ban nha': ['spain', 'spanish'],
            'canada': ['canada', 'canadian'],
            'úc': ['australia', 'australian'],
            'brasil': ['brazil', 'brazilian'],
            'mexico': ['mexico', 'mexican'],
            'nga': ['russia', 'russian'],
            'phần lan': ['finland', 'finnish'],
            'pháp': ['france', 'french'],
        }
    
    def _load_model(self):
        """Load SBERT model"""
        try:
            self.model = SentenceTransformer(self.model_name)
        except Exception as e:
            print(f"Failed to load SBERT model: {e}")
            self.model = None
    
    def extract_keywords(self, query: str) -> dict:
        """
        Extract keywords from search query with smart query classification
        Returns: {
            'query_type': 'structured' | 'title_search' | 'natural',
            'genres': list[str],
            'country': str,
            'year': int,    
            'movie_title': str,
            'keywords': list[str],
            'original_query': str
        }
        """
        query_lower = query.lower()
        result = {
            'query_type': 'natural',  # Default type
            'genres': [],
            'country': '',
            'year': None,
            'movie_title': '',
            'keywords': [],
            'original_query': query
        }
        
        # Classify query type
        result['query_type'] = self._classify_query_type(query_lower)
        
        # Process based on query type
        if result['query_type'] == 'structured':
            self._process_structured_query(query_lower, result)
        elif result['query_type'] == 'title_search':
            self._process_title_search_query(query_lower, result)
        else:  # natural query
            self._process_natural_query(query_lower, result)
        
        return result
    
    def _classify_query_type(self, query: str) -> str:
        """Classify query type: structured, title_search, or natural"""
        
        # Check for structured query (contains commas or clear filter indicators)
        if (',' in query or 
            any(indicator in query for indicator in ['thể loại', 'quốc gia', 'năm', 'năm sản xuất', 'type', 'country', 'year'])):
            return 'structured'
        
        # Check for simple country/year patterns - treat as structured
        country_year_patterns = [
            r'phim\s+(mỹ|nhật bản|hàn quốc|trung quốc|việt nam|anh|pháp|đức|ý|tây ban nha|canada|úc|brasil|mexico|nga|phần lan)',
            r'phim\s+(năm\s+)?(19[0-9]{2}|20[0-3][0-9])',
            r'(19[0-9]{2}|20[0-3][0-9])\s*$'
        ]
        
        for pattern in country_year_patterns:
            if re.search(pattern, query):
                return 'structured'
        
        # Check for title search (short queries with no Vietnamese filter words)
        words = query.split()
        if (len(query.strip()) <= 20 and  # Short query
            len(words) <= 3 and  # Few words
            not any(filter_word in query for filter_word in ['mỹ', 'nhật', 'hàn quốc', 'trung quốc', 'việt nam', 'anh', 'pháp', 'đức', 'ý', 'tây ban nha', 'canada', 'úc', 'brasil', 'mexico', 'nga', 'phần lan']) and
            not any(genre_word in query for genre_word in ['hành động', 'hình sự', 'tình cảm', 'kinh dị', 'hài', 'hoạt hình', 'phiêu lưu', 'khoa học', 'gia đình', 'chiến tranh', 'thể thao', 'nhạc', 'tài liệu', 'chính kịch', 'lịch sử', 'bí ẩn', 'gây cấn', 'giả tưởng', 'miền tây']) and
            not any(year_word in query for year_word in ['năm', 'year'])):
            return 'title_search'
        
        # Default to natural query
        return 'natural'
    
    def _process_structured_query(self, query: str, result: dict):
        """Process structured queries like 'Phim hoạt hình, Nhật bản, năm 2025'"""
        
        # Special patterns for "Phim [quốc gia]" and "Phim năm [năm]"
        country_patterns = [
            r'phim\s+(mỹ|nhật bản|hàn quốc|trung quốc|việt nam|anh|pháp|đức|ý|tây ban nha|canada|úc|brasil|mexico|nga|phần lan)',
            r'phim\s+(năm\s+)?(19[0-9]{2}|20[0-3][0-9])'
        ]
        
        # Check for "Phim [quốc gia]" pattern
        country_match = re.search(country_patterns[0], query)
        if country_match:
            country_name = country_match.group(1)
            # Map Vietnamese country name to English
            for country_vn, country_en_list in self.country_mappings.items():
                if country_name in country_vn or country_vn in country_name:
                    result['country'] = country_en_list[0]
                    break
        
        # Check for "Phim năm [năm]" or just "Phim [năm]" pattern
        year_match = re.search(country_patterns[1], query)
        if year_match:
            year_str = year_match.group(2)
            result['year'] = int(year_str)
        
        # Split by commas and process each part for additional filters
        parts = [part.strip() for part in query.split(',')]
        
        for part in parts:
            # Extract genres
            for genre, keywords in self.genre_keywords.items():
                for keyword in keywords:
                    if keyword in part:
                        if genre not in result['genres']:
                            result['genres'].append(genre)
                        break
            
            # Extract country (if not already found)
            if not result['country']:
                for country_vn, country_en_list in self.country_mappings.items():
                    for country_en in country_en_list:
                        if country_en in part or country_vn in part:
                            result['country'] = country_en_list[0]
                            break
                    if result['country']:
                        break
            
            # Extract year (if not already found)
            if not result['year']:
                year_matches = re.findall(r'\b(19[0-9]{2}|20[0-3][0-9])\b', part)
                if year_matches:
                    result['year'] = int(year_matches[0])
        
        # For structured queries, don't extract movie title
        result['movie_title'] = ''
    
    def _process_title_search_query(self, query: str, result: dict):
        """Process title search queries like 'john' or 'Dorae'"""
        
        # Use the entire query as movie title search
        result['movie_title'] = query.strip().title()
        
        # Don't extract filters for title search queries
        result['genres'] = []
        result['country'] = ''
        result['year'] = None
    
    def _process_natural_query(self, query: str, result: dict):
        """Process natural language queries like 'Tôi có thể tìm phim hoạt hình nhật bản của năm 2025'"""
        
        # Ensure we're working with lowercase for pattern matching
        query_lower = query.lower()
        
        # Extract movie title using patterns (for natural queries that might include movie titles)
        title_patterns = [
            r'tên\s+là\s+(.+?)(?:\s+(?:mỹ|nhật|hàn quốc|trung quốc|việt nam|anh|pháp|đức|ý|tây ban nha|canada|úc|brasil|mexico|nga|phần lan)\s*$|$)',  # "tên là john wick"
            r'có\s+tên\s+là\s+(.+?)(?:\s+(?:mỹ|nhật|hàn quốc|trung quốc|việt nam|anh|pháp|đức|ý|tây ban nha|canada|úc|brasil|mexico|nga|phần lan)\s*$|$)',  # "có tên là john wick"
            r'với\s+tên\s+là\s+(.+?)(?:\s+(?:mỹ|nhật|hàn quốc|trung quốc|việt nam|anh|pháp|đức|ý|tây ban nha|canada|úc|brasil|mexico|nga|phần lan)\s*$|$)',  # "với tên là john wick"
            r'tên\s+(.+?)(?:\s+(?:mỹ|nhật|hàn quốc|trung quốc|việt nam|anh|pháp|đức|ý|tây ban nha|canada|úc|brasil|mexico|nga|phần lan)\s*$|$)',  # "tên john wick" (fallback)
            r'phim\s+(.+?)(?:\s+(?:mỹ|nhật|hàn quốc|trung quốc|việt nam|anh|pháp|đức|ý|tây ban nha|canada|úc|brasil|mexico|nga|phần lan)\s*$|$)',  # "phim john wick" 
            r'có\s+tên\s+(.+?)(?:\s+(?:mỹ|nhật|hàn quốc|trung quốc|việt nam|anh|pháp|đức|ý|tây ban nha|canada|úc|brasil|mexico|nga|phần lan)\s*$|$)',  # "có tên john wick"
            r'với\s+tên\s+(.+?)(?:\s+(?:mỹ|nhật|hàn quốc|trung quốc|việt nam|anh|pháp|đức|ý|tây ban nha|canada|úc|brasil|mexico|nga|phần lan)\s*$|$)',  # "với tên john wick"
        ]
        
        # Try specific title patterns first
        for pattern in title_patterns:
            match = re.search(pattern, query_lower)
            if match:
                title = match.group(1).strip()
                if len(title) > 2:  # Minimum title length
                    # Special check for "phim [word]" pattern - only check the first word after "phim"
                    if 'phim ' in query_lower:
                        phim_index = query_lower.find('phim ')
                        after_phim = query_lower[phim_index + 5:].strip()  # Get text after "phim "
                        first_word_after_phim = after_phim.split()[0] if after_phim.split() else ''
                        
                        # Check if the first word after "phim" is a genre
                        is_genre = False
                        for genre_name, genre_keywords in self.genre_keywords.items():
                            for keyword in genre_keywords:
                                if first_word_after_phim.lower() == keyword.lower():
                                    is_genre = True
                                    break
                            if is_genre:
                                break
                        
                        # If the word after "phim" is a genre, don't set movie title
                        if is_genre:
                            break
                    
                    # For other patterns, check if the extracted title is a genre
                    is_genre = False
                    title_lower = title.lower()
                    
                    # Check against all genre keywords
                    for genre_name, genre_keywords in self.genre_keywords.items():
                        for keyword in genre_keywords:
                            if title_lower == keyword.lower():
                                is_genre = True
                                break
                        if is_genre:
                            break
                    
                    # Only set movie title if it's not a genre
                    if not is_genre:
                        result['movie_title'] = title.title()
                        break
        
        # Extract genres using pattern matching
        for genre, keywords in self.genre_keywords.items():
            for keyword in keywords:
                if keyword in query_lower:
                    if genre not in result['genres']:
                        result['genres'].append(genre)
        
        # Extract country using pattern matching
        for country_vn, country_en_list in self.country_mappings.items():
            for country_en in country_en_list:
                if country_en in query_lower or country_vn in query_lower:
                    result['country'] = country_en_list[0]
                    break
            if result['country']:
                break
        
        # Extract year (4-digit numbers between 1900-2030)
        year_matches = re.findall(r'\b(19[0-9]{2}|20[0-3][0-9])\b', query)
        if year_matches:
            result['year'] = int(year_matches[0])
        
        # Use SBERT to extract semantic keywords if model is available
        if self.model and len(result['genres']) == 0 and not result['country'] and not result['movie_title']:
            semantic_keywords = self._extract_semantic_keywords(query)
            result['keywords'].extend(semantic_keywords)
    
    def _extract_semantic_keywords(self, query: str) -> list[str]:
        """Use SBERT to find semantically similar categories"""
        if not self.model:
            return []
        
        try:
            # Get all categories from database
            categories = list(Category.objects.values_list('name', flat=True))
            if not categories:
                return []
            
            # Encode query and categories
            query_embedding = self.model.encode([query], convert_to_numpy=True)[0]
            category_embeddings = self.model.encode(categories, convert_to_numpy=True)
            
            # Calculate similarities
            from .embeddings import cosine_similarity
            similarities = cosine_similarity(query_embedding, category_embeddings)
            
            # Get top 3 most similar categories with threshold > 0.5
            top_indices = np.argsort(-similarities)[:3]
            semantic_keywords = []
            
            for idx in top_indices:
                if similarities[idx] > 0.5:  # Threshold for semantic similarity
                    semantic_keywords.append(categories[idx])
            
            return semantic_keywords
            
        except Exception as e:
            print(f"Error in semantic keyword extraction: {e}")
            return []
    
    def format_extracted_info(self, keywords: dict) -> str:
        """Format extracted keywords for display"""
        parts = []
        
        if keywords['movie_title']:
            parts.append(f"Tên phim: {keywords['movie_title']}")
        
        if keywords['genres']:
            parts.append(f"Thể loại: {', '.join(keywords['genres'])}")
        
        if keywords['country']:
            parts.append(f"Quốc gia: {keywords['country'].title()}")
        
        if keywords['year']:
            parts.append(f"Năm: {keywords['year']}")
        
        if keywords['keywords']:
            parts.append(f"Từ khóa: {', '.join(keywords['keywords'])}")
        
        return ' | '.join(parts) if parts else 'Không phát hiện từ khóa cụ thể'


# Singleton instance
extractor = KeywordExtractor()
