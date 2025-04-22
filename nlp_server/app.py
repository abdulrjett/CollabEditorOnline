import os
import json
import requests
import re
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
import nltk
import pronouncing
from nltk.corpus import wordnet
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
# Import the Hugging Face Transformers library
from transformers import pipeline

# Add HTML/XML processing libraries
import html
from bs4 import BeautifulSoup
from html.parser import HTMLParser

# Dictionary API configuration
DICTIONARY_API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/"

# Download required NLTK data if not already downloaded
try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('taggers/averaged_perceptron_tagger')
except LookupError:
    nltk.download('averaged_perceptron_tagger')

try:
    nltk.data.find('taggers/maxent_treebank_pos_tagger')
except LookupError:
    nltk.download('maxent_treebank_pos_tagger')

try:
    nltk.data.find('corpora/brown')
except LookupError:
    nltk.download('brown')

# Initialize the zero-shot classification pipeline with optimized settings
print("Loading the zero-shot classification model...")
try:
    # Using sequence classification with specific model for better thematic analysis
    zero_shot_classifier = pipeline("zero-shot-classification", 
                                   model="facebook/bart-large-mnli",
                                   device=-1)  # Auto-select device
    print("Zero-shot classification model loaded successfully")
except Exception as e:
    print(f"Error loading zero-shot classification model: {str(e)}")
    zero_shot_classifier = None

# Create Flask app
app = Flask(__name__)
CORS(app)

# Special handling for war poems - ensuring accurate classification
WAR_POEM_SIGNALS = ["flanders", "poppies", "guns", "quarrel", "torch", "battle", "soldier", 
                    "crosses", "row", "ranks", "trench", "bomb", "artillery"]

# Define theme categories and their associated keywords
THEMES = {
    "Love": ["love", "heart", "romance", "passion", "emotion", "affection", "relationship", "desire", "intimate", "feelings", 
             "devotion", "adoration", "attachment", "warmth", "tenderness", "fondness", "caring", "cherish", "infatuation", 
             "longing", "compassion", "romantic", "embrace", "kiss", "heartfelt", "soulmate", "sweetheart", "beloved"],
    "Nature": ["nature", "environment", "ecosystem", "wildlife", "forest", "ocean", "mountain", "river", "animal", "plant",
              "wilderness", "species", "habitat", "biodiversity", "conservation", "organic", "sustainable", "ecosystem", "climate",
              "weather", "landscape", "terrain", "flora", "fauna", "ecology", "biosphere", "natural", "preservation", "environmental",
              "flower", "tree", "garden", "petal", "bloom", "leaf", "earth", "sky", "sea", "water", "breeze", "rain", "sunshine"],
    "Death/Mortality": ["death", "dying", "mortality", "grave", "funeral", "cemetery", "deceased", "passing", "grief", "mourning",
                "loss", "tomb", "burial", "memorial", "perish", "mortal", "finite", "end", "afterlife", "heaven", "hell",
                "soul", "spirit", "eternal", "remembrance", "eulogy", "commemoration", "tribute", "legacy", "crosses", "dead", "lie", "died", "fallen"],
    "Time/Change": ["time", "change", "transformation", "evolution", "progress", "development", "growth", "decay", "transition", "metamorphosis",
               "shift", "alteration", "modification", "revolution", "progression", "cycle", "era", "period", "epoch", "age",
               "fleeting", "permanent", "temporary", "eternal", "ephemeral", "memory", "nostalgia", "future", "past", "present", "days", "dawn", "sunset"],
    "Identity/Self": ["identity", "self", "individual", "personality", "character", "essence", "introspection", "consciousness", "awareness", 
               "reflection", "ego", "psyche", "soul", "existence", "being", "persona", "selfhood", "uniqueness", "authenticity", 
               "integrity", "dignity", "pride", "honor", "reputation", "heritage", "ancestry", "roots", "origin", "belonging"],
    "Spirituality/Faith": ["spirituality", "faith", "belief", "religion", "divine", "sacred", "holy", "worship", "prayer", "meditation",
                      "contemplation", "enlightenment", "transcendence", "mystical", "metaphysical", "spiritual", "soul", "deity",
                      "god", "goddess", "heaven", "salvation", "blessing", "ritual", "ceremony", "devotion", "scripture", "prophet", "doctrine"],
    "War/Conflict": ["war", "battle", "conflict", "fight", "struggle", "combat", "soldier", "army", "warrior", "enemy", 
                   "foe", "victory", "defeat", "peace", "truce", "armistice", "weapon", "gun", "sword", "battle", 
                   "bloodshed", "violence", "destruction", "devastation", "military", "veteran", "sacrifice", "honor", "duty",
                   "patriotism", "flag", "country", "nation", "ally", "wound", "scar", "trauma", "survivor", "memorial", "remember", 
                   "poppies", "flanders", "field", "trench", "uniform", "medal", "artillery", "gunfire", "bomb", "explosion", "regiment", "battalion",
                   "quarrel", "torch", "guns", "crosses", "row", "ranks", "line", "fallen", "comrade", "burial", "grave", "cemetery",
                   "brave", "courage", "valor", "bravery", "heroism", "defend", "defense", "attack", "advance", "retreat", "march", "campaign"],
    "Freedom/Oppression": ["freedom", "liberty", "independence", "autonomy", "choice", "right", "emancipation", "liberation", "free",
                         "oppression", "tyranny", "subjugation", "enslavement", "captivity", "confinement", "persecution", "suppression",
                         "restriction", "limitation", "censorship", "control", "domination", "dictator", "totalitarian", "authoritarianism",
                         "resistance", "rebellion", "uprising", "revolution", "protest", "democracy", "equality", "justice", "injustice"],
    "Dreams/Imagination": ["dream", "imagination", "fantasy", "vision", "aspiration", "hope", "wish", "desire", "longing", "yearning",
                          "creativity", "innovation", "inspiration", "idea", "concept", "thought", "mind", "contemplation", "reflection",
                          "reverie", "daydream", "fantasy", "surreal", "magical", "wonder", "awe", "amazement", "fascination", "curiosity"],
    "Hope/Despair": ["hope", "optimism", "faith", "confidence", "trust", "belief", "positivity", "brightness", "light", "promise",
                    "prospect", "anticipation", "eagerness", "enthusiasm", "encouragement", "inspiration", "motivation", "despair", 
                    "hopelessness", "despondency", "depression", "gloom", "misery", "suffering", "anguish", "sorrow", "grief", 
                    "dejection", "desolation", "darkness", "bleakness", "emptiness", "void", "nihilism", "resignation", "surrender"]
}

# Define genre categories and their associated patterns
GENRES = {
    "Poetry": {
        "keywords": ["verse", "poem", "stanza", "rhyme", "rhythm", "poet", "lyric", "sonnet", "metaphor", "imagery", 
                    "meter", "quatrain", "couplet", "alliteration", "assonance", "consonance", "syllable", "iambic", 
                    "trochaic", "anapestic", "ballad", "haiku", "limerick", "ode", "epic", "free verse", "poetry", "poet"],
        "patterns": [
            r"\n\n.*\n\n",          # Multiple line breaks often indicate stanzas
            r"[,;.!?]['\"]?$\n",    # Lines ending with punctuation
            r"\s{2,}",              # Intentional spacing
            r"\n[A-Z][a-z]",        # New lines starting with capital (could be line beginnings in poetry)
            r"[,;.!?][ ]*\n[A-Z]",  # End punctuation followed by a new line and capital (line breaks)
            r"\n.*[,;][ ]*\n",      # Lines ending with commas or semicolons (enjambment)
            r"([a-z]+)[;,]\s+\1",   # Repeated words with specific punctuation (anaphora)
            r"[a-z]+ing[,;]\s+[a-z]+ing", # Parallel structure with -ing words (common in poetry)
        ]
    },
    "Essay": {
        "keywords": ["argue", "thesis", "point", "evidence", "conclusion", "analysis", "perspective", "examination", 
                    "discuss", "evaluate", "essay", "argument", "proposition", "assert", "claim", "stance", "view", 
                    "perspective", "critique", "assessment", "judgment", "interpretation", "appraisal", "review", 
                    "discourse", "exposition", "treatise", "academic", "scholarly"],
        "patterns": [
            r"^In conclusion,",
            r"^Furthermore,",
            r"^Therefore,",
            r"^Moreover,",
            r"^To summarize,",
            r"^In summary,",
            r"^Thus,",
            r"^Consequently,",
            r"^However,",
            r"^On the other hand,",
            r"^For instance,",
            r"^For example,",
            r"^In contrast,",
            r"^Additionally,",
            r"^First(ly)?[,.]",
            r"^Second(ly)?[,.]",
            r"^Third(ly)?[,.]",
            r"^Finally[,.]",
            r"\([A-Za-z\s]+, \d{4}\)" # Citation format
        ]
    },
    "Story": {
        "keywords": ["character", "plot", "setting", "narrative", "scene", "protagonist", "fiction", "tale", "dialogue", 
                    "adventure", "story", "novel", "hero", "villain", "conflict", "resolution", "climax", "action", 
                    "drama", "suspense", "tension", "flashback", "foreshadowing", "narrator", "chapter", "storytelling",
                    "fantasy", "mystery", "thriller", "romance", "fiction"],
        "patterns": [
            r'".*?"',                 # Dialogue in quotes
            r"said",
            r"asked",
            r"replied",
            r"Chapter \d+",           # Chapter headings
            r"[Hh]e (said|thought|felt|saw|heard|knew)", # Common narrative phrases
            r"[Ss]he (said|thought|felt|saw|heard|knew)",
            r"[Tt]hey (said|thought|felt|saw|heard|knew)",
            r"The \w+ (was|were|had)",# Descriptive phrases
            r"[A-Z][a-z]+ (sat|stood|walked|ran|looked|smiled|frowned|nodded)", # Action verbs with proper nouns
            r"[Oo]ne day",            # Story beginnings
            r"[Oo]nce upon a time",
            r"[Ll]ong ago",
            r"[Tt]he end"             # Story endings
        ]
    },
    "Letter": {
        "keywords": ["dear", "sincerely", "regards", "address", "recipient", "sender", "greeting", "closing", "date", 
                    "yours", "letter", "correspondence", "mail", "sincerely", "faithfully", "cordially", "best wishes", 
                    "respectfully", "ps", "postscript", "attachment", "enclosure", "reference"],
        "patterns": [
            r"^Dear\s[A-Z][a-z]+,",
            r"Sincerely,",
            r"Best regards,",
            r"^To whom it may concern",
            r"^Yours truly,",
            r"^Yours sincerely,",
            r"^Respectfully,",
            r"^Best wishes,",
            r"^Kind regards,",
            r"^P\.S\.",              # Post-script notation
            r"\d{1,2}(st|nd|rd|th)? [A-Z][a-z]+ \d{4}", # Date formats
            r"^Re:",                  # Regarding line
            r"^From:",                # From line
            r"^To:"                   # To line
        ]
    },
    "Technical": {
        "keywords": ["technical", "specification", "document", "manual", "guide", "documentation", "procedure", "protocol", 
                    "instruction", "reference", "handbook", "resource", "tutorial", "guideline", "standard", "requirement", 
                    "implementation", "configuration", "installation", "troubleshooting", "operation", "maintenance"],
        "patterns": [
            r"Figure \d+",            # Figures
            r"Table \d+",             # Tables
            r"Section \d+\.\d+",      # Section numbering
            r"Step \d+",              # Step numbering
            r"^\d+\.\d+\s",           # Numbered sections
            r"^• ",                   # Bullet points
            r"^NOTE:",                # Notes
            r"^WARNING:",             # Warnings
            r"^CAUTION:",             # Cautions
            r"^IMPORTANT:"            # Important notes
        ]
    },
    "Academic": {
        "keywords": ["research", "study", "analysis", "experiment", "methodology", "hypothesis", "theory", "framework", 
                    "literature", "review", "citation", "reference", "publication", "journal", "abstract", "introduction", 
                    "method", "result", "discussion", "conclusion", "implication", "limitation", "future", "investigation"],
        "patterns": [
            r"(?:et al\.|et\. al)\.,? \d{4}",  # Citation format
            r"\([A-Za-z\s]+, \d{4}\)",         # Citation format
            r"\([A-Za-z\s]+, \d{4}[a-z]?\)",   # Citation format with letter
            r"^\d\. Introduction",              # Numbered sections
            r"^\d\. Literature Review",
            r"^\d\. Methodology",
            r"^\d\. Results",
            r"^\d\. Discussion",
            r"^\d\. Conclusion",
            r"p < 0\.\d+",                     # p-values
            r"[Ff]ig\. \d+",                   # Figure references
            r"[Tt]able \d+",                   # Table references
            r"(?:[Rr]eferences|[Bb]ibliography):"  # References section
        ]
    }
}

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

@app.route('/get_rhymes', methods=['GET'])
def get_rhymes():
    word = request.args.get('word', '').lower()
    
    if not word:
        return jsonify({
            'error': 'Missing word parameter',
            'rhymes': [],
            'synonyms': []
        })
    
    # Get rhymes using pronouncing library
    rhymes = pronouncing.rhymes(word)
    
    # Limit to 15 rhymes
    rhymes = rhymes[:15] if rhymes else ["No rhymes found"]
    
    # Get synonyms using WordNet
    synonyms = []
    for syn in wordnet.synsets(word):
        for lemma in syn.lemmas():
            synonym = lemma.name().replace('_', ' ')
            if synonym != word and synonym not in synonyms:
                synonyms.append(synonym)
    
    # Limit to 15 synonyms
    synonyms = synonyms[:15] if synonyms else ["No synonyms found"]
    
    return jsonify({
        'word': word,
        'rhymes': rhymes,
        'synonyms': synonyms
    })

@app.route('/analyze_text', methods=['POST'])
def analyze_text():
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({
            'error': 'Missing text in request body',
            'themes': {},
            'genres': {}
        })
    
    text = data['text']
    
    # Analyze themes and genres
    themes = analyze_themes(text)
    genres = analyze_genres(text)
    keywords = extract_keywords(text)
    
    return jsonify({
        'themes': themes,
        'genres': genres,
        'keywords': keywords
    })

def analyze_themes(text):
    """Analyze text for themes using zero-shot classification with Hugging Face Transformers"""
    # Check if the zero-shot classifier is available
    if zero_shot_classifier is None:
        print("Zero-shot classifier not available, falling back to keyword method")
        return analyze_themes_legacy(text)
        
    try:
        # Prepare theme labels
        theme_labels = list(THEMES.keys())
        
        # If text is very long, split it into chunks to avoid context length issues
        max_length = 1024  # BART model has a max context length
        chunks = []
        
        if len(text) > max_length:
            # Split the text into sentences
            sentences = nltk.sent_tokenize(text)
            current_chunk = ""
            
            for sentence in sentences:
                if len(current_chunk) + len(sentence) < max_length:
                    current_chunk += sentence + " "
                else:
                    chunks.append(current_chunk.strip())
                    current_chunk = sentence + " "
            
            # Add the last chunk if it's not empty
            if current_chunk.strip():
                chunks.append(current_chunk.strip())
        else:
            chunks = [text]
        
        # Process each chunk and aggregate results
        theme_scores = {theme: 0.0 for theme in theme_labels}
        chunk_count = len(chunks)
        
        for chunk in chunks:
            # Use more specific templates for better zero-shot classification
            hypothesis_templates = [
                "This text is about {}.",
                "The theme of this text is {}.",
                "This passage discusses {}."
            ]
            
            # Run multiple classifications with different templates for more robust results
            chunk_scores = {theme: 0.0 for theme in theme_labels}
            
            for template in hypothesis_templates:
                result = zero_shot_classifier(
                    chunk, 
                    candidate_labels=theme_labels, 
                    multi_label=True,
                    hypothesis_template=template
                )
                
                # Aggregate scores from this template
                for label, score in zip(result['labels'], result['scores']):
                    chunk_scores[label] += score / len(hypothesis_templates)
            
            # Add this chunk's scores to overall scores
            for theme in theme_labels:
                theme_scores[theme] += chunk_scores[theme] / chunk_count
        
        # Apply contextual analysis for specific thematic elements in the text
        lower_text = text.lower()
        
        # Special handling for war-themed texts - implemented directly in the main model
        if "War/Conflict" in theme_scores:
            # War signals that may be missed by the model
            war_signals = ["war", "battle", "soldier", "guns", "poppies", "flanders", "crosses", 
                         "quarrel", "torch", "artillery", "trench", "bomb", "army", "military", 
                         "combat", "warrior", "enemy", "battlefield", "regiment", "battalion"]
            
            # Count significant war signals
            war_signal_count = sum(1 for signal in war_signals if signal in lower_text)
            
            # If multiple war signals are found, adjust the model's score appropriately
            if war_signal_count >= 3:
                # Significant war content detected, moderately increase score
                boost_factor = min(0.25, 0.08 * war_signal_count)  # Cap at 25% boost
                war_score = theme_scores["War/Conflict"]
                theme_scores["War/Conflict"] = war_score * (1 + boost_factor)
            
            # Special case for "In Flanders Fields" and similar poems
            if ("flanders" in lower_text and "poppies" in lower_text) or ("crosses" in lower_text and "row" in lower_text):
                # This is almost certainly a war poem - ensure War/Conflict is dominant
                theme_scores["War/Conflict"] = max(theme_scores["War/Conflict"], 
                                                 max(score for theme, score in theme_scores.items() 
                                                     if theme != "War/Conflict") * 1.25)
                
                # Adjust Death/Mortality as a secondary theme
                if "Death/Mortality" in theme_scores:
                    theme_scores["Death/Mortality"] = max(theme_scores["Death/Mortality"], 
                                                        theme_scores["War/Conflict"] * 0.75)
        
        # Convert scores to percentages
        total_score = sum(theme_scores.values())
        theme_percentages = {}
        
        if total_score > 0:
            for theme, score in theme_scores.items():
                # Convert to percentage and round to nearest integer
                theme_percentages[theme] = round((score / total_score) * 100)
        
        return theme_percentages
        
    except Exception as e:
        print(f"Error in zero-shot theme analysis: {str(e)}")
        # Fallback to legacy method if there's any error
        return analyze_themes_legacy(text)

def analyze_themes_legacy(text):
    """Legacy method to analyze text for themes using keyword matching and TF-IDF"""
    # Preprocess the text
    text = text.lower()
    tokens = word_tokenize(text)
    stop_words = set(stopwords.words('english'))
    filtered_tokens = [w for w in tokens if w.isalnum() and w not in stop_words]
    
    # Theme scores
    theme_scores = {}
    
    # Count theme keyword occurrences with contextual weighting
    for theme, keywords in THEMES.items():
        # Basic keyword counting
        keyword_count = 0
        for token in filtered_tokens:
            # Direct match
            if token in keywords:
                # Give higher weight to war-related terms for more accurate classification
                if theme == "War/Conflict" and token in ["war", "battle", "soldier", "guns", "poppies", "flanders"]:
                    keyword_count += 1.5  # Higher weight for strong war indicators
                else:
                    keyword_count += 1
            
            # Partial match with longer keywords (stemming-like approach)
            for keyword in keywords:
                if len(keyword) > 4 and len(token) > 4 and (keyword.startswith(token) or token.startswith(keyword)):
                    keyword_count += 0.5
        
        # Use WordNet to check for synonyms of theme keywords
        for token in filtered_tokens:
            for keyword in keywords:
                try:
                    # Get synsets for the token and keyword
                    token_synsets = wordnet.synsets(token)
                    keyword_synsets = wordnet.synsets(keyword)
                    
                    # Check for synonym relationships
                    if token_synsets and keyword_synsets:
                        # Check if any synset paths overlap
                        for t_syn in token_synsets:
                            for k_syn in keyword_synsets:
                                # Compute semantic similarity if they're the same part of speech
                                if t_syn.pos() == k_syn.pos():
                                    similarity = t_syn.path_similarity(k_syn)
                                    if similarity and similarity > 0.7:  # High similarity threshold
                                        keyword_count += 0.7
                except Exception:
                    continue  # Skip on any WordNet errors
        
        theme_scores[theme] = keyword_count
    
    # Context-based frequency adjustment with special handling for war poems
    # Words that appear in proximity to theme keywords get a boost
    text_chunks = [text[i:i+200] for i in range(0, len(text), 100)]  # Overlapping chunks
    for theme, keywords in THEMES.items():
        for chunk in text_chunks:
            chunk_lower = chunk.lower()
            # If chunk contains a theme keyword, boost score for that theme
            if any(keyword in chunk_lower for keyword in keywords):
                # Count other theme words in this chunk
                theme_word_count = sum(1 for keyword in keywords if keyword in chunk_lower)
                
                # Special handling for war poetry
                if theme == "War/Conflict":
                    war_signals = ["flanders", "poppies", "guns", "crosses", "row", "brave", "soldier", "battle", "fought"]
                    war_signal_count = sum(1 for signal in war_signals if signal in chunk_lower)
                    
                    if war_signal_count >= 2:
                        # Strong indication of war poetry, apply higher boost
                        theme_scores[theme] = theme_scores.get(theme, 0) + (theme_word_count * 1.0)
                    elif theme_word_count > 1:
                        theme_scores[theme] = theme_scores.get(theme, 0) + (theme_word_count * 0.6)
                else:
                    # Normal handling for other themes
                    if theme_word_count > 1:  # Multiple theme words in proximity
                        theme_scores[theme] = theme_scores.get(theme, 0) + (theme_word_count * 0.5)
    
    # Normalize scores
    total_score = sum(theme_scores.values())
    if total_score > 0:
        for theme in theme_scores:
            # Calculate percentage and round to nearest integer
            theme_scores[theme] = round((theme_scores[theme] / total_score) * 100)
    
    # Use TF-IDF for more sophisticated matching
    if len(filtered_tokens) > 20:  # Only perform this analysis for longer texts
        try:
            text_without_stopwords = ' '.join(filtered_tokens)
            
            # Create documents for each theme
            theme_docs = [' '.join(THEMES[theme]) for theme in THEMES]
            all_docs = [text_without_stopwords] + theme_docs
            
            # Compute TF-IDF with better parameters
            vectorizer = TfidfVectorizer(ngram_range=(1, 2),  # Include bigrams
                                        min_df=2,             # Minimum document frequency
                                        max_df=0.85,          # Maximum document frequency
                                        use_idf=True)
            tfidf_matrix = vectorizer.fit_transform(all_docs)
            
            # Compute cosine similarity between the text and each theme
            text_vector = tfidf_matrix[0:1]
            theme_similarities = cosine_similarity(text_vector, tfidf_matrix[1:]).flatten()
            
            # Update theme scores based on similarities with dynamic weighting
            for i, theme in enumerate(THEMES.keys()):
                # Calculate weighted similarity score based on text length
                weight = min(70, 30 + (len(filtered_tokens) // 100))  # Longer texts get more weight on semantic similarity
                similarity_score = int(theme_similarities[i] * weight)
                
                # Special handling for War/Conflict theme detection for poems like "In Flanders Fields"
                if theme == "War/Conflict":
                    # Check for specific war-related terms that may not be captured well by general similarity
                    war_terms = ["flanders", "poppies", "guns", "quarrel", "crosses", "row", "torch"]
                    war_term_count = sum(1 for term in war_terms if term in text_without_stopwords)
                    
                    if war_term_count >= 2:
                        # Increase similarity score for war theme when specific terms are present
                        similarity_boost = min(30, war_term_count * 10)
                        similarity_score += similarity_boost
                
                # Combine with existing score using weighted average
                current_score = theme_scores[theme]
                theme_scores[theme] = min(100, int((current_score * 0.7) + (similarity_score * 0.3)))
        except Exception as e:
            print(f"Error in TF-IDF analysis: {str(e)}")
    
    # Final adjustment: ensure no theme dominates unreasonably
    # If any theme is above 80%, reduce it slightly
    max_theme = max(theme_scores.items(), key=lambda x: x[1], default=(None, 0))
    if max_theme[1] > 80:
        theme_scores[max_theme[0]] = 80
        # Redistribute to second highest theme
        themes_sorted = sorted(theme_scores.items(), key=lambda x: x[1], reverse=True)
        if len(themes_sorted) > 1:
            second_theme = themes_sorted[1][0]
            theme_scores[second_theme] += min(10, 100 - sum(theme_scores.values()))
    
    return theme_scores

def analyze_genres(text):
    """Analyze text to determine probable genres using zero-shot classification"""
    # Check if the zero-shot classifier is available
    if zero_shot_classifier is None:
        print("Zero-shot classifier not available for genre analysis, falling back to pattern method")
        return analyze_genres_legacy(text)
        
    try:
        # Prepare genre labels
        genre_labels = list(GENRES.keys())
        
        # If text is very long, split it into chunks to avoid context length issues
        max_length = 1024  # BART model has a max context length
        chunks = []
        
        if len(text) > max_length:
            # Split the text into sentences
            sentences = nltk.sent_tokenize(text)
            current_chunk = ""
            
            for sentence in sentences:
                if len(current_chunk) + len(sentence) < max_length:
                    current_chunk += sentence + " "
                else:
                    chunks.append(current_chunk.strip())
                    current_chunk = sentence + " "
            
            # Add the last chunk if it's not empty
            if current_chunk.strip():
                chunks.append(current_chunk.strip())
        else:
            chunks = [text]
        
        # Process each chunk and aggregate results
        genre_scores = {genre: 0.0 for genre in genre_labels}
        chunk_count = len(chunks)
        
        for chunk in chunks:
            # Run zero-shot classification
            result = zero_shot_classifier(chunk, candidate_labels=genre_labels, multi_label=True)
            
            # Aggregate scores
            for label, score in zip(result['labels'], result['scores']):
                genre_scores[label] += score / chunk_count  # Average across chunks
        
        # Convert scores to percentages
        total_score = sum(genre_scores.values())
        genre_percentages = {}
        
        if total_score > 0:
            for genre, score in genre_scores.items():
                # Convert to percentage and round to nearest integer
                genre_percentages[genre] = round((score / total_score) * 100)
        
        # Apply confidence adjustments - boost the top genre if there's a clear winner
        genres_sorted = sorted(genre_percentages.items(), key=lambda x: x[1], reverse=True)
        if len(genres_sorted) >= 2:
            top_genre, top_score = genres_sorted[0]
            second_genre, second_score = genres_sorted[1]
            
            # If there's a clear winner (more than 20% gap)
            if top_score - second_score > 20:
                # Increase confidence in the top genre
                extra_points = min(10, 100 - top_score)
                genre_percentages[top_genre] += extra_points
                
                # Slightly reduce second place if possible
                if second_score > 5:
                    genre_percentages[second_genre] -= min(5, second_score - 5)
                    
        # Add structural analysis insights to refine the model's prediction
        # This combines the best of both worlds: AI model prediction + structural features
        refined_scores = refine_genre_scores_with_structure(text, genre_percentages)
        
        return refined_scores
        
    except Exception as e:
        print(f"Error in zero-shot genre analysis: {str(e)}")
        # Fallback to legacy method if there's any error
        return analyze_genres_legacy(text)

def refine_genre_scores_with_structure(text, genre_scores):
    """Refine genre scores with structural analysis of the text"""
    # Calculate structure features
    lines = text.split('\n')
    non_empty_lines = [line for line in lines if line.strip()]
    
    # Default values
    avg_line_length = 0
    paragraph_count = 1
    dialogue_ratio = 0
    quoted_text_ratio = 0
    technical_elements = 0
    
    if non_empty_lines:
        # Average line length
        avg_line_length = sum(len(line) for line in non_empty_lines) / len(non_empty_lines)
        
        # Number of paragraphs (sequences of lines separated by blank lines)
        for i in range(1, len(lines)):
            if not lines[i-1].strip() and lines[i].strip():
                paragraph_count += 1
        
        # Dialogue ratio (lines with quotes / total lines)
        dialogue_lines = sum(1 for line in non_empty_lines if '"' in line)
        dialogue_ratio = dialogue_lines / len(non_empty_lines) if non_empty_lines else 0
        
        # Quoted text ratio
        text_length = len(text)
        quoted_text = 0
        in_quote = False
        for char in text:
            if char == '"':
                in_quote = not in_quote
            if in_quote:
                quoted_text += 1
        quoted_text_ratio = quoted_text / text_length if text_length > 0 else 0
        
        # Technical elements (bullets, numbers, etc.)
        technical_count = 0
        for line in non_empty_lines:
            if re.match(r'^\d+\.', line) or re.match(r'^•', line) or re.match(r'^-', line):
                technical_count += 1
        technical_elements = technical_count / len(non_empty_lines) if non_empty_lines else 0
    
    # Apply structural adjustments to refine the AI predictions
    refined_scores = genre_scores.copy()
    
    # Poetry structural adjustments
    if avg_line_length < 40 and "Poetry" in refined_scores:
        poetry_boost = min(15, 100 - refined_scores["Poetry"])
        refined_scores["Poetry"] += poetry_boost
    
    # Story structural adjustments
    if dialogue_ratio > 0.2 and "Story" in refined_scores:
        story_boost = min(10, 100 - refined_scores["Story"])
        refined_scores["Story"] += story_boost
    
    # Technical/Academic structural adjustments
    if technical_elements > 0.15:
        if "Technical" in refined_scores:
            tech_boost = min(10, 100 - refined_scores["Technical"])
            refined_scores["Technical"] += tech_boost
        if "Academic" in refined_scores:
            academic_boost = min(8, 100 - refined_scores["Academic"])
            refined_scores["Academic"] += academic_boost
    
    # Letter structural checks
    if len(lines) > 2:
        first_line = lines[0].lower()
        last_lines = [line.lower() for line in lines[-5:] if line.strip()]
        
        if ("dear" in first_line and 
            any("sincerely" in line or "regards" in line or "truly" in line for line in last_lines) and
            "Letter" in refined_scores):
            letter_boost = min(15, 100 - refined_scores["Letter"])
            refined_scores["Letter"] += letter_boost
    
    # Re-normalize after adjustments
    total = sum(refined_scores.values())
    if total > 0:
        for genre in refined_scores:
            refined_scores[genre] = round((refined_scores[genre] / total) * 100)
    
    return refined_scores

def analyze_genres_legacy(text):
    """Legacy method to analyze text for genres using pattern matching"""
    # Preprocess the text
    lower_text = text.lower()
    
    # Genre scores
    genre_scores = {}
    
    # Initial text structure analysis to help genre identification
    structure_features = {
        "avg_line_length": 0,
        "num_paragraphs": 0,
        "dialogue_ratio": 0,
        "quoted_text_ratio": 0,
        "technical_elements": 0,
        "formatting_elements": 0
    }
    
    # Calculate structure features
    lines = text.split('\n')
    non_empty_lines = [line for line in lines if line.strip()]
    if non_empty_lines:
        # Average line length
        structure_features["avg_line_length"] = sum(len(line) for line in non_empty_lines) / len(non_empty_lines)
        
        # Number of paragraphs (sequences of lines separated by blank lines)
        paragraph_count = 1  # Start with 1 for the first paragraph
        for i in range(1, len(lines)):
            if not lines[i-1].strip() and lines[i].strip():
                paragraph_count += 1
        structure_features["num_paragraphs"] = paragraph_count
        
        # Dialogue ratio (lines with quotes / total lines)
        dialogue_lines = sum(1 for line in non_empty_lines if '"' in line)
        structure_features["dialogue_ratio"] = dialogue_lines / len(non_empty_lines)
        
        # Quoted text ratio
        text_length = len(text)
        quoted_text = 0
        in_quote = False
        for char in text:
            if char == '"':
                in_quote = not in_quote
            if in_quote:
                quoted_text += 1
        structure_features["quoted_text_ratio"] = quoted_text / text_length if text_length > 0 else 0
        
        # Technical elements (bullets, numbers, etc.)
        technical_count = 0
        for line in non_empty_lines:
            if re.match(r'^\d+\.', line) or re.match(r'^•', line) or re.match(r'^-', line):
                technical_count += 1
        structure_features["technical_elements"] = technical_count / len(non_empty_lines)
        
        # Formatting elements (asterisks, underscores for bold/italic, etc.)
        formatting_count = sum(line.count('*') + line.count('_') + line.count('==') for line in non_empty_lines)
        structure_features["formatting_elements"] = formatting_count / len(non_empty_lines)
    
    # Check for keyword matches with weighted scoring
    for genre, genre_data in GENRES.items():
        # Count keyword occurrences with positional weighting
        keyword_count = 0
        for keyword in genre_data["keywords"]:
            # Simple count
            occurrences = lower_text.count(keyword)
            
            # Add more weight for keywords in title-like positions or beginnings of paragraphs
            for i, line in enumerate(lines):
                line_lower = line.lower()
                
                # Title position (first few lines)
                if i < 3 and keyword in line_lower:
                    keyword_count += 2
                
                # Paragraph beginning
                if (i == 0 or not lines[i-1].strip()) and keyword in line_lower:
                    keyword_count += 1.5
                    
                # Section heading (short line with keyword)
                if len(line) < 50 and keyword in line_lower and line.strip().endswith(':'):
                    keyword_count += 2
            
            keyword_count += occurrences
        
        # Check for pattern matches with frequency analysis
        pattern_count = 0
        for pattern in genre_data["patterns"]:
            matches = re.findall(pattern, text)
            
            # Apply different weights based on pattern significance
            if len(matches) > 0:
                # Some patterns are more distinctive than others
                if "Chapter" in pattern or "Dear" in pattern or "Sincerely" in pattern:
                    pattern_count += len(matches) * 3  # Very strong indicators
                elif "said" in pattern or "asked" in pattern or "dialogue" in pattern:
                    pattern_count += len(matches) * 0.5  # Common but less distinctive
                else:
                    pattern_count += len(matches)
        
        # Calculate score with weighted components
        base_score = (keyword_count * 2) + (pattern_count * 3)
        
        # Apply genre-specific structure adjustments
        if genre == "Poetry":
            # Poetry often has shorter lines
            if structure_features["avg_line_length"] < 40:
                base_score += 15
            # Poetry often has many short paragraphs/stanzas
            if structure_features["num_paragraphs"] > 5 and structure_features["avg_line_length"] < 50:
                base_score += 10
                
        elif genre == "Story":
            # Stories often have significant dialogue
            if structure_features["dialogue_ratio"] > 0.2:
                base_score += 20
            # Stories typically have medium-length paragraphs
            if 40 < structure_features["avg_line_length"] < 100:
                base_score += 10
                
        elif genre == "Essay" or genre == "Academic":
            # Essays/Academic papers often have longer paragraphs
            if structure_features["avg_line_length"] > 80:
                base_score += 15
            # Technical elements suggest essays/academic papers
            if structure_features["technical_elements"] > 0.1:
                base_score += 15
                
        elif genre == "Technical":
            # Technical documents often have formatting elements and technical markers
            if structure_features["technical_elements"] > 0.2 or structure_features["formatting_elements"] > 0.1:
                base_score += 20
                
        elif genre == "Letter":
            # Letters have distinctive opening/closing patterns that were already counted
            # Additional points for having correct letter structure (greeting at beginning, closing at end)
            first_line = lines[0].lower() if lines else ""
            last_lines = [line.lower() for line in lines[-5:] if line.strip()]
            
            if "dear" in first_line:
                base_score += 10
            if any("sincerely" in line or "regards" in line or "truly" in line for line in last_lines):
                base_score += 10
        
        genre_scores[genre] = base_score
    
    # Normalize scores
    total_score = sum(genre_scores.values())
    if total_score > 0:
        for genre in genre_scores:
            # Calculate percentage and round to nearest integer
            genre_scores[genre] = round((genre_scores[genre] / total_score) * 100)
    
    # Apply confidence adjustments
    # If a genre is significantly more likely than others, boost its score
    genres_sorted = sorted(genre_scores.items(), key=lambda x: x[1], reverse=True)
    if len(genres_sorted) >= 2:
        top_genre, top_score = genres_sorted[0]
        second_genre, second_score = genres_sorted[1]
        
        # If there's a clear winner (more than 20% gap)
        if top_score - second_score > 20:
            # Increase confidence in the top genre
            extra_points = min(10, 100 - top_score)
            genre_scores[top_genre] += extra_points
            
            # Slightly reduce second place if possible
            if second_score > 5:
                genre_scores[second_genre] -= min(5, second_score - 5)
    
    return genre_scores

def extract_keywords(text):
    """Extract important keywords from the text using advanced NLP techniques"""
    # Preprocess the text
    text = text.lower()
    
    # Basic tokenization for initial processing
    tokens = word_tokenize(text)
    stop_words = set(stopwords.words('english'))
    
    # More sophisticated filtering
    # Keep words that are longer than 3 chars and not stopwords
    filtered_tokens = [w for w in tokens if w.isalnum() and w not in stop_words and len(w) > 3]
    
    # Extract proper nouns as potential important entities
    proper_nouns = []
    sentences = nltk.sent_tokenize(text)
    
    for sentence in sentences:
        # Tag parts of speech
        try:
            word_tokens = nltk.word_tokenize(sentence)
            pos_tags = nltk.pos_tag(word_tokens)
            
            # Extract proper nouns (NNP, NNPS)
            for word, tag in pos_tags:
                if tag in ['NNP', 'NNPS'] and len(word) > 2 and word.lower() not in stop_words:
                    proper_nouns.append(word)
        except Exception as e:
            print(f"Error in POS tagging: {str(e)}")
    
    # Use TF-IDF for term importance with n-gram support
    try:
        # Prepare sentences for TF-IDF
        if len(sentences) > 2:
            # Create TF-IDF vectorizer with n-grams
            vectorizer = TfidfVectorizer(
                max_features=30,           # Extract more features initially
                ngram_range=(1, 2),        # Include unigrams and bigrams
                min_df=1,                  # Minimum document frequency
                max_df=0.8,                # Maximum document frequency (ignore very common words)
                use_idf=True,              # Use inverse document frequency
                sublinear_tf=True          # Apply sublinear scaling to term frequency
            )
            
            # Fit and transform the sentences
            tfidf_matrix = vectorizer.fit_transform(sentences)
            
            # Get feature names (words or phrases)
            feature_names = vectorizer.get_feature_names_out()
            
            # Calculate the average TF-IDF score for each term across all sentences
            tfidf_scores = tfidf_matrix.sum(axis=0).A1
            
            # Create word-score pairs and sort by score
            word_scores = [(feature_names[i], tfidf_scores[i]) for i in range(len(feature_names))]
            word_scores.sort(key=lambda x: x[1], reverse=True)
            
            # Get top keywords from TF-IDF
            tfidf_keywords = [word for word, score in word_scores[:15]]
            
            # Add contextual relevance - check if keywords appear near theme words
            enhanced_keywords = []
            theme_all_keywords = []
            for theme_keywords in THEMES.values():
                theme_all_keywords.extend(theme_keywords)
            
            for keyword in tfidf_keywords:
                # Base score from TF-IDF
                keyword_score = dict(word_scores)[keyword] if keyword in dict(word_scores) else 0
                
                # Check proximity to theme words for contextual relevance
                context_bonus = 0
                for i, sent in enumerate(sentences):
                    if keyword in sent.lower():
                        # Check if any theme words are in this sentence
                        theme_words_in_sent = sum(1 for tw in theme_all_keywords if tw in sent.lower())
                        if theme_words_in_sent > 0:
                            context_bonus += 0.5 * theme_words_in_sent
                
                # Apply context bonus
                enhanced_score = keyword_score * (1 + context_bonus)
                enhanced_keywords.append((keyword, enhanced_score))
            
            # Sort by enhanced score
            enhanced_keywords.sort(key=lambda x: x[1], reverse=True)
            
            # Get top keywords after enhancement
            keywords = [word for word, _ in enhanced_keywords[:12]]
            
            # Add important proper nouns that weren't already captured
            proper_noun_counts = {}
            for noun in proper_nouns:
                if noun.lower() not in [k.lower() for k in keywords]:
                    proper_noun_counts[noun] = proper_noun_counts.get(noun, 0) + 1
            
            # Get most frequent proper nouns
            sorted_proper_nouns = sorted(proper_noun_counts.items(), key=lambda x: x[1], reverse=True)
            top_proper_nouns = [noun for noun, count in sorted_proper_nouns[:3] if count > 1]
            
            # Add top proper nouns to keywords
            for noun in top_proper_nouns:
                if len(keywords) < 15:  # Limit to 15 total keywords
                    keywords.append(noun)
            
            return keywords
            
    except Exception as e:
        print(f"Error in TF-IDF keyword extraction: {str(e)}")
    
    # If TF-IDF fails, fallback to frequency-based extraction
    
    # Try to extract bigrams as well
    try:
        bigrams = list(nltk.bigrams(filtered_tokens))
        bigram_freq = {}
        for bg in bigrams:
            bg_str = f"{bg[0]} {bg[1]}"
            if len(bg[0]) > 2 and len(bg[1]) > 2:  # Only meaningful bigrams
                bigram_freq[bg_str] = bigram_freq.get(bg_str, 0) + 1
        
        # Get top bigrams
        top_bigrams = sorted(bigram_freq.items(), key=lambda x: x[1], reverse=True)[:5]
    except Exception:
        top_bigrams = []
    
    # Combine with most frequent unigrams
    from collections import Counter
    word_freq = Counter(filtered_tokens)
    unigrams = [word for word, freq in word_freq.most_common(10)]
    
    # Combine unigrams and bigrams, prioritizing bigrams
    keywords = []
    for bg, _ in top_bigrams:
        keywords.append(bg)
    
    # Add unigrams that don't overlap with bigrams
    for word in unigrams:
        if len(keywords) < 15 and not any(word in bg for bg in keywords):
            keywords.append(word)
    
    # Include proper nouns that appear multiple times
    proper_noun_counter = Counter(proper_nouns)
    for noun, count in proper_noun_counter.most_common(3):
        if count > 1 and noun not in keywords and len(keywords) < 15:
            keywords.append(noun)
    
    return keywords[:15]  # Return at most 15 keywords

@app.route('/get_definition', methods=['GET'])
def get_definition():
    word = request.args.get('word', '').lower().strip()
    
    if not word:
        return jsonify({
            'error': 'Missing word parameter',
            'definitions': []
        })
    
    try:
        # Call the Dictionary API
        response = requests.get(f"{DICTIONARY_API_URL}{word}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Format the response
            definitions = []
            
            if data and isinstance(data, list) and len(data) > 0:
                entry = data[0]
                
                # Get word phonetics if available
                phonetic = None
                if 'phonetic' in entry and entry['phonetic']:
                    phonetic = entry['phonetic']
                elif 'phonetics' in entry and len(entry['phonetics']) > 0:
                    for p in entry['phonetics']:
                        if 'text' in p and p['text']:
                            phonetic = p['text']
                            break
                
                # Process each meaning
                if 'meanings' in entry:
                    for meaning in entry['meanings']:
                        part_of_speech = meaning.get('partOfSpeech', '')
                        
                        if 'definitions' in meaning:
                            for definition in meaning['definitions'][:2]:  # Limit to 2 definitions per part of speech
                                definition_text = definition.get('definition', '')
                                example = definition.get('example', '')
                                
                                if definition_text:
                                    def_entry = {
                                        'part_of_speech': part_of_speech,
                                        'definition': definition_text
                                    }
                                    
                                    if example:
                                        def_entry['example'] = example
                                    
                                    definitions.append(def_entry)
            
            # If no definitions from API, try WordNet as backup
            if not definitions:
                for synset in wordnet.synsets(word)[:2]:  # Limit to 2 synsets
                    definitions.append({
                        'part_of_speech': synset.pos(),
                        'definition': synset.definition()
                    })
            
            result = {
                'word': word,
                'phonetic': phonetic,
                'definitions': definitions[:5]  # Limit to 5 definitions total
            }
            
            return jsonify(result)
        else:
            # Fallback to WordNet if the API fails
            definitions = []
            for synset in wordnet.synsets(word)[:3]:  # Limit to 3 definitions
                definitions.append({
                    'part_of_speech': synset.pos(),
                    'definition': synset.definition()
                })
            
            if definitions:
                return jsonify({
                    'word': word,
                    'definitions': definitions
                })
            else:
                return jsonify({
                    'error': 'No definitions found',
                    'word': word,
                    'definitions': []
                })
                
    except Exception as e:
        print(f"Error fetching definition: {str(e)}")
        return jsonify({
            'error': 'Error fetching definition',
            'word': word,
            'definitions': []
        })

@app.route('/preserve_formatting', methods=['POST'])
def preserve_formatting():
    """
    Endpoint to preserve and adapt formatting when text is imported from external sources
    like Word, PDFs, or web pages.
    """
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({
            'error': 'Missing text in request body',
            'formatted_text': '',
            'format_data': {}
        })
    
    source_text = data['text']
    source_type = data.get('source_type', 'auto')  # 'auto', 'html', 'word', 'pdf', 'plaintext'
    
    # Determine the source type if set to auto
    if source_type == 'auto':
        if source_text.strip().startswith('<') and ('</p>' in source_text or '</div>' in source_text):
            source_type = 'html'
        elif '{\rtf1' in source_text:
            source_type = 'rtf'
        else:
            source_type = 'plaintext'
    
    # Process based on detected format
    formatted_text, format_data = process_formatting(source_text, source_type)
    
    return jsonify({
        'formatted_text': formatted_text,
        'format_data': format_data,
        'detected_source': source_type
    })

def process_formatting(text, source_type):
    """
    Process text to preserve its formatting based on source type
    Returns: (formatted_text, format_data)
    - formatted_text: Text with some basic formatting preserved
    - format_data: JSON structure with detailed formatting information
    """
    # Initialize format data structure
    format_data = {
        'paragraphs': [],
        'styles': {},
        'lists': [],
        'alignment': {}
    }
    
    if source_type == 'html':
        return process_html_formatting(text, format_data)
    elif source_type == 'rtf':
        return process_rtf_formatting(text, format_data)
    else:
        # For plaintext, preserve paragraph structure and detect lists
        paragraphs = text.split('\n\n')
        formatted_text = text
        
        # Detect and preserve lists
        list_patterns = [
            (r'^\s*(\d+\.|\d+\))\s', 'ordered'),  # Numbered lists
            (r'^\s*[-•*]\s', 'unordered')          # Bullet lists
        ]
        
        for i, para in enumerate(paragraphs):
            lines = para.split('\n')
            is_list = False
            list_type = None
            
            # Check if this paragraph is a list
            for pattern, list_style in list_patterns:
                if any(re.match(pattern, line) for line in lines):
                    is_list = True
                    list_type = list_style
                    break
            
            if is_list:
                format_data['lists'].append({
                    'paragraph_index': i,
                    'type': list_type,
                    'items': [line.strip() for line in lines if line.strip()]
                })
            
            format_data['paragraphs'].append({
                'text': para,
                'is_list': is_list,
                'list_type': list_type
            })
        
        return formatted_text, format_data

def process_html_formatting(html_text, format_data):
    """Process HTML text to preserve formatting"""
    try:
        # Parse HTML
        soup = BeautifulSoup(html_text, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.extract()
        
        # Extract text while preserving basic formatting
        paragraphs = []
        paragraph_index = 0
        
        # Process paragraphs, headings, and lists
        for element in soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'li', 'ul', 'ol']):
            if element.name in ['p', 'div'] and element.text.strip():
                # Process paragraph
                para_text = element.text.strip()
                paragraphs.append(para_text)
                
                # Extract style information
                style_dict = {}
                if element.get('style'):
                    style_text = element['style']
                    # Parse inline CSS
                    for style_item in style_text.split(';'):
                        if ':' in style_item:
                            key, value = style_item.split(':', 1)
                            style_dict[key.strip()] = value.strip()
                
                # Determine text alignment
                align_value = None
                if element.get('align'):
                    align_value = element['align']
                elif 'text-align' in style_dict:
                    align_value = style_dict['text-align']
                
                if align_value:
                    format_data['alignment'][paragraph_index] = align_value
                
                # Extract font information
                font_info = {}
                if 'font-family' in style_dict:
                    font_info['family'] = style_dict['font-family']
                if 'font-size' in style_dict:
                    font_info['size'] = style_dict['font-size']
                if 'color' in style_dict:
                    font_info['color'] = style_dict['color']
                
                # Handle bold, italic, etc.
                is_bold = False
                is_italic = False
                if 'font-weight' in style_dict and style_dict['font-weight'] in ['bold', '700', '800', '900']:
                    is_bold = True
                if 'font-style' in style_dict and style_dict['font-style'] == 'italic':
                    is_italic = True
                
                # Check for bold/italic elements inside
                if element.find('b') or element.find('strong'):
                    is_bold = True
                if element.find('i') or element.find('em'):
                    is_italic = True
                
                if is_bold:
                    font_info['bold'] = True
                if is_italic:
                    font_info['italic'] = True
                
                if font_info:
                    format_data['styles'][paragraph_index] = font_info
                
                format_data['paragraphs'].append({
                    'text': para_text,
                    'is_list': False,
                    'style': font_info
                })
                
                paragraph_index += 1
                
            elif element.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] and element.text.strip():
                # Process heading
                heading_text = element.text.strip()
                paragraphs.append(heading_text)
                
                # Add heading style
                format_data['styles'][paragraph_index] = {
                    'heading': True,
                    'level': int(element.name[1]),
                    'bold': True,
                    'size': f"{22 - int(element.name[1])}px"  # Approximate size based on heading level
                }
                
                format_data['paragraphs'].append({
                    'text': heading_text,
                    'is_heading': True,
                    'heading_level': int(element.name[1])
                })
                
                paragraph_index += 1
                
            elif element.name in ['ul', 'ol'] and not element.parent.name in ['ul', 'ol']:
                # Process list (only top-level lists to avoid duplication)
                list_type = 'ordered' if element.name == 'ol' else 'unordered'
                list_items = [item.text.strip() for item in element.find_all('li', recursive=False) if item.text.strip()]
                
                if list_items:
                    # Add list items as a single paragraph
                    list_text = '\n'.join(f"{'* ' if list_type == 'unordered' else f'{i+1}. '}{item}" 
                                         for i, item in enumerate(list_items))
                    paragraphs.append(list_text)
                    
                    format_data['lists'].append({
                        'paragraph_index': paragraph_index,
                        'type': list_type,
                        'items': list_items
                    })
                    
                    format_data['paragraphs'].append({
                        'text': list_text,
                        'is_list': True,
                        'list_type': list_type,
                        'items': list_items
                    })
                    
                    paragraph_index += 1
        
        # Join paragraphs with double newlines to preserve structure
        formatted_text = '\n\n'.join(paragraphs)
        
        return formatted_text, format_data
        
    except Exception as e:
        print(f"Error processing HTML: {str(e)}")
        # Fallback to plaintext processing
        return process_formatting(html.unescape(html_text), 'plaintext')

def process_rtf_formatting(rtf_text, format_data):
    """Process RTF text to preserve formatting (simplified version)"""
    # This is a simplified implementation - a full RTF parser would be more complex
    try:
        # Extract plain text from RTF (very basic approach)
        text = rtf_text
        
        # Remove RTF control words and groups
        text = re.sub(r'\\[a-z0-9]+(-?\d+)?[ ]?', '', text)
        text = re.sub(r'{\*?\\[^{}]*}', '', text)
        text = re.sub(r'{|}', '', text)
        
        # Replace escaped characters
        text = text.replace('\\\\', '\\')
        text = text.replace('\\{', '{')
        text = text.replace('\\}', '}')
        
        # Split into paragraphs (RTF uses \par for paragraph breaks)
        paragraphs = re.split(r'\\par\s*', text)
        paragraphs = [p.strip() for p in paragraphs if p.strip()]
        
        # Process paragraphs similar to plaintext
        for i, para in enumerate(paragraphs):
            format_data['paragraphs'].append({
                'text': para,
                'is_list': False
            })
        
        formatted_text = '\n\n'.join(paragraphs)
        return formatted_text, format_data
        
    except Exception as e:
        print(f"Error processing RTF: {str(e)}")
        # Fallback to plaintext
        return process_formatting(rtf_text, 'plaintext')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f'Starting NLP server on port {port}...')
    print(f'Access the API at http://localhost:{port}')
    print('Press Ctrl+C to stop the server')
    app.run(host='0.0.0.0', port=port, debug=False) 