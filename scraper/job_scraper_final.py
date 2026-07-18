import requests
import re
import json
import csv
import sys
import os
import io
from datetime import datetime, timezone
from html import unescape
from bs4 import BeautifulSoup

SKILL_CATEGORIES = {
    "programming": {"python", "java", "javascript", "typescript", "c++", "c#", "go", "rust", "ruby", "php", "swift", "kotlin", "scala", "r", "perl", "bash", "shell", "powershell", "dart", "lua", "haskell", "elixir", "clojure"},
    "databases": {"sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "dynamodb", "cassandra", "oracle", "sqlite", "mariadb", "neo4j", "firebase", "supabase", "cockroachdb"},
    "cloud": {"aws", "azure", "gcp", "google cloud", "heroku", "digitalocean", "cloudflare", "vercel", "netlify"},
    "devops": {"docker", "kubernetes", "terraform", "ansible", "jenkins", "ci/cd", "github actions", "gitlab ci", "circleci", "helm", "vagrant", "puppet", "chef", "prometheus", "grafana", "datadog", "nginx", "apache"},
    "frameworks": {"react", "angular", "vue", "svelte", "next.js", "nuxt", "django", "flask", "fastapi", "spring", "express", "nestjs", "rails", "laravel", ".net", "gatsby", "remix", "astro", "tailwind", "bootstrap"},
    "data_science": {"pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", "keras", "spark", "hadoop", "airflow", "dbt", "tableau", "power bi", "matplotlib", "jupyter", "machine learning", "deep learning", "nlp", "computer vision", "data engineering"},
    "tools": {"git", "jira", "confluence", "slack", "figma", "linux", "agile", "scrum", "rest", "graphql", "grpc", "kafka", "rabbitmq", "api", "microservices", "sap", "salesforce", "snowflake"},
}

ALL_SKILLS = {}
for cat, skills in SKILL_CATEGORIES.items():
    for s in skills:
        ALL_SKILLS[s] = cat


def clean_html(text):
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_skills(text):
    if not text:
        return [], {}
    text_lower = text.lower()
    found = set()
    for skill in ALL_SKILLS:
        pattern = r"(?<![a-zA-Z])" + re.escape(skill) + r"(?![a-zA-Z])"
        if re.search(pattern, text_lower):
            found.add(skill)
    categorized = {}
    for skill in sorted(found):
        cat = ALL_SKILLS[skill]
        categorized.setdefault(cat, []).append(skill)
    return sorted(found), categorized


def infer_schedule_type(title, description):
    text = (title + " " + description).lower()
    if any(k in text for k in ["full-time", "full time", "fulltime", "permanent"]):
        return "Full-time"
    if any(k in text for k in ["part-time", "part time", "parttime"]):
        return "Part-time"
    if any(k in text for k in ["contract", "contractor", "freelance"]):
        return "Contractor"
    if any(k in text for k in ["intern", "internship"]):
        return "Internship"
    return "Full-time"


def infer_remote(tags, location, title, description):
    text = (title + " " + description + " " + location).lower()
    tag_text = " ".join(t.lower() for t in tags) if tags else ""
    if any(k in text or k in tag_text for k in ["remote", "work from home", "wfh", "anywhere", "distributed"]):
        return True
    return False


def infer_no_degree(description):
    text = description.lower()
    if any(k in text for k in ["no degree", "without a degree", "degree not required", "no formal education"]):
        return True
    if not any(k in text for k in ["bachelor", "master", "degree", "b.s.", "m.s.", "ph.d", "phd", "diploma", "university", "college"]):
        return True
    return False


def infer_health_insurance(description):
    text = description.lower()
    return any(k in text for k in ["health insurance", "medical insurance", "health benefits", "medical benefits", "healthcare", "health care", "dental", "vision"])


def shorten_title(title):
    title = re.sub(r"\s*[\(\[].*?[\)\]]", "", title)
    title = re.sub(r"\s*[-–—|/].*?(senior|junior|lead|staff|principal|intern|remote|hybrid).*$", "", title, flags=re.I)
    title = re.sub(r"\s*(senior|sr\.?|junior|jr\.?|lead|staff|principal|chief|head of)\s+", " ", title, flags=re.I).strip()
    if len(title) > 50:
        title = title[:50].rsplit(" ", 1)[0]
    return title.strip() or title


def parse_salary(text):
    if not text:
        return "", "", ""
    text = text.lower().replace(",", "").replace("$", "")
    yearly = re.findall(r"(\d{2,3})k?\s*(?:[-–to]+\s*\$?\s*(\d{2,3})k?)?(?:\s*(?:per\s*)?(?:year|annual|yr|pa))", text)
    if yearly:
        nums = [int(x) for x in yearly[0] if x]
        nums = [n * 1000 if n < 1000 else n for n in nums]
        avg = sum(nums) / len(nums)
        return "year", f"{avg:.0f}", ""
    hourly = re.findall(r"(\d{2,3})(?:\s*[-–to]+\s*\$?\s*(\d{2,3}))?(?:\s*(?:per\s*)?(?:hour|hr|/h))", text)
    if hourly:
        nums = [int(x) for x in hourly[0] if x]
        avg = sum(nums) / len(nums)
        return "hour", "", f"{avg:.1f}"
    big_nums = re.findall(r"(\d{4,6})\s*(?:[-–to]+\s*\$?\s*(\d{4,6}))?", text)
    if big_nums:
        nums = [int(x) for x in big_nums[0] if x]
        if all(n > 20000 for n in nums):
            avg = sum(nums) / len(nums)
            return "year", f"{avg:.0f}", ""
    return "", "", ""


def infer_country(location):
    if not location:
        return ""
    loc = location.lower()
    country_map = {
        "usa": "United States", "us": "United States", "united states": "United States",
        "uk": "United Kingdom", "united kingdom": "United Kingdom", "england": "United Kingdom",
        "canada": "Canada", "germany": "Germany", "france": "France", "india": "India",
        "australia": "Australia", "netherlands": "Netherlands", "spain": "Spain",
        "ireland": "Ireland", "brazil": "Brazil", "japan": "Japan", "singapore": "Singapore",
        "europe": "Europe", "worldwide": "Worldwide", "anywhere": "Worldwide", "global": "Worldwide",
    }
    for key, val in country_map.items():
        if key in loc:
            return val
    us_states = ["california", "new york", "texas", "washington", "florida", "illinois",
                 "massachusetts", "colorado", "georgia", "virginia", "oregon", "pennsylvania",
                 "north carolina", "ohio", "michigan", "arizona", "minnesota", "maryland",
                 " ca", " ny", " tx", " wa", " fl", " il", " ma", " co", " ga", " va",
                 " or", " pa", " nc", " oh", " mi", " az", " mn", " md", "san francisco",
                 "los angeles", "seattle", "new york", "chicago", "boston", "denver", "austin",
                 "atlanta", "portland", "miami", "philadelphia", "dallas", "houston"]
    for st in us_states:
        if st in loc:
            return "United States"
    return ""


def fetch_remoteok():
    url = "https://remoteok.com/api"
    headers = {"User-Agent": "Mozilla/5.0 (job-scraper-demo/1.0)"}
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, list) and len(data) > 0 and "legal" in str(data[0]).lower():
        data = data[1:]
    return data


def fetch_arbeitnow(pages=3):
    results = []
    for page in range(1, pages + 1):
        url = f"https://www.arbeitnow.com/api/job-board-api?page={page}"
        headers = {"User-Agent": "Mozilla/5.0 (job-scraper-demo/1.0)"}
        try:
            resp = requests.get(url, headers=headers, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            jobs = data.get("data", [])
            if not jobs:
                break
            results.extend(jobs)
        except Exception:
            break
    return results


def process_remoteok(jobs):
    rows = []
    for job in jobs:
        if not isinstance(job, dict):
            continue
        title = clean_html(job.get("position", ""))
        if not title:
            continue
        company = clean_html(job.get("company", ""))
        location = clean_html(job.get("location", "")) or "Remote"
        tags = job.get("tags", []) or []
        description = clean_html(job.get("description", ""))
        posted = job.get("date", "")
        salary_min = job.get("salary_min")
        salary_max = job.get("salary_max")

        tag_skills = [t.lower() for t in tags if t.lower() in ALL_SKILLS]
        desc_skills, desc_cat = extract_skills(description + " " + " ".join(tags))
        all_found = sorted(set(tag_skills + desc_skills))
        categorized = {}
        for s in all_found:
            cat = ALL_SKILLS[s]
            categorized.setdefault(cat, []).append(s)

        schedule = infer_schedule_type(title, description)
        remote = infer_remote(tags, location, title, description)
        no_degree = infer_no_degree(description)
        health_ins = infer_health_insurance(description)
        country = infer_country(location)
        short_title = shorten_title(title)

        salary_rate, salary_year, salary_hour = "", "", ""
        if salary_min and salary_max:
            try:
                avg = (int(salary_min) + int(salary_max)) / 2
                if avg > 1000:
                    salary_rate = "year"
                    salary_year = f"{avg:.0f}"
                else:
                    salary_rate = "hour"
                    salary_hour = f"{avg:.1f}"
            except (ValueError, TypeError):
                pass
        if not salary_rate:
            salary_rate, salary_year, salary_hour = parse_salary(description)

        if posted:
            try:
                dt = datetime.fromisoformat(posted.replace("Z", "+00:00"))
                posted = dt.strftime("%Y-%m-%d %H:%M:%S")
            except Exception:
                pass

        job_url = job.get("url", "")
        if not job_url and job.get("slug"):
            job_url = f"https://remoteok.com/remote-jobs/{job['slug']}"

        rows.append({
            "job_title_short": short_title,
            "job_title": title,
            "job_location": location,
            "job_via": "RemoteOK",
            "job_schedule_type": schedule,
            "job_work_from_home": "TRUE" if remote else "FALSE",
            "search_location": location,
            "job_posted_date": posted,
            "job_no_degree_mention": "TRUE" if no_degree else "FALSE",
            "job_health_insurance": "TRUE" if health_ins else "FALSE",
            "job_country": country,
            "salary_rate": salary_rate,
            "salary_year_avg": salary_year,
            "salary_hour_avg": salary_hour,
            "company_name": company,
            "job_skills": str(all_found) if all_found else "",
            "job_type_skills": str(categorized) if categorized else "",
            "job_url": job_url,
        })
    return rows


def process_arbeitnow(jobs):
    rows = []
    for job in jobs:
        if not isinstance(job, dict):
            continue
        title = clean_html(job.get("title", ""))
        if not title:
            continue
        company = clean_html(job.get("company_name", ""))
        location = clean_html(job.get("location", ""))
        tags = job.get("tags", []) or []
        description = clean_html(job.get("description", ""))
        posted = job.get("created_at", "")
        remote_flag = job.get("remote", False)

        desc_skills, categorized = extract_skills(description + " " + title + " " + " ".join(tags))
        schedule = infer_schedule_type(title, description)
        is_remote = remote_flag or infer_remote(tags, location, title, description)
        no_degree = infer_no_degree(description)
        health_ins = infer_health_insurance(description)
        country = infer_country(location)
        short_title = shorten_title(title)
        salary_rate, salary_year, salary_hour = parse_salary(description)

        if posted:
            try:
                dt = datetime.fromtimestamp(int(posted), tz=timezone.utc)
                posted = dt.strftime("%Y-%m-%d %H:%M:%S")
            except Exception:
                pass

        rows.append({
            "job_title_short": short_title,
            "job_title": title,
            "job_location": location or ("Remote" if is_remote else ""),
            "job_via": "Arbeitnow",
            "job_schedule_type": schedule,
            "job_work_from_home": "TRUE" if is_remote else "FALSE",
            "search_location": location or ("Remote" if is_remote else ""),
            "job_posted_date": posted,
            "job_no_degree_mention": "TRUE" if no_degree else "FALSE",
            "job_health_insurance": "TRUE" if health_ins else "FALSE",
            "job_country": country,
            "salary_rate": salary_rate,
            "salary_year_avg": salary_year,
            "salary_hour_avg": salary_hour,
            "company_name": company,
            "job_skills": str(desc_skills) if desc_skills else "",
            "job_type_skills": str(categorized) if categorized else "",
            "job_url": job.get("url", ""),
        })
    return rows


def fetch_keejob(pages=5):
    results = []
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    }
    for page in range(1, pages + 1):
        url = f"https://www.keejob.com/offres-emploi/?page={page}"
        try:
            resp = requests.get(url, headers=headers, timeout=30)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            h2_tags = soup.find_all("h2")
            for h2 in h2_tags:
                link = h2.find("a", href=re.compile(r"/offres-emploi/\d+/"))
                if not link:
                    continue
                job = {}
                job["title"] = link.get_text(strip=True)
                if not job["title"]:
                    continue
                job["url"] = "https://www.keejob.com" + link["href"]

                card = h2.parent
                company_p = card.find("p")
                if company_p:
                    company_link = company_p.find("a", href=re.compile(r"/offres-emploi/companies/"))
                    job["company"] = company_link.get_text(strip=True) if company_link else ""
                else:
                    job["company"] = ""

                tags_div = card.find("div", class_=re.compile(r"flex.*wrap"))
                tag_texts = []
                if tags_div:
                    for span in tags_div.find_all("span"):
                        tag_texts.append(span.get_text(strip=True))
                contract = ""
                for t in tag_texts:
                    if t.upper() in ("CDI", "CDD", "SIVP", "STAGE", "FREELANCE"):
                        contract = t.upper()
                        break
                job["contract"] = contract

                salary_text = " ".join(tag_texts)
                salary_match = re.search(r"(\d[\d\s]*)\s*[-–]\s*(\d[\d\s]*)\s*TND", salary_text)
                job["salary_text"] = salary_match.group(0) if salary_match else ""

                desc_div = card.find("div", class_=re.compile(r"mb-3"))
                if desc_div:
                    desc_p = desc_div.find("p")
                    job["description"] = desc_p.get_text(strip=True) if desc_p else ""
                else:
                    job["description"] = ""

                loc_span = card.find("i", class_=re.compile(r"fa-map-marker"))
                if loc_span and loc_span.parent:
                    loc_text = loc_span.parent.get_text(strip=True)
                    job["location"] = loc_text
                else:
                    job["location"] = ""

                date_span = card.find("i", class_=re.compile(r"fa-clock"))
                if date_span and date_span.parent:
                    job["date"] = date_span.parent.get_text(strip=True)
                else:
                    job["date"] = ""

                results.append(job)
        except Exception as e:
            print(f"Keejob page {page} failed: {e}", file=sys.stderr)
            continue
    return results


def process_keejob(jobs):
    rows = []
    contract_map = {
        "CDI": "Full-time",
        "CDD": "Contractor",
        "SIVP": "Internship",
        "STAGE": "Internship",
        "FREELANCE": "Contractor",
        "INTÉRIM": "Contractor",
    }
    french_months = {
        "janvier": "01", "février": "02", "mars": "03", "avril": "04",
        "mai": "05", "juin": "06", "juillet": "07", "août": "08",
        "septembre": "09", "octobre": "10", "novembre": "11", "décembre": "12",
    }
    for job in jobs:
        title = clean_html(job.get("title", ""))
        if not title:
            continue
        company = clean_html(job.get("company", ""))
        location = clean_html(job.get("location", "")) or "Tunisia"
        description = clean_html(job.get("description", ""))
        contract = job.get("contract", "").upper()
        salary_text = job.get("salary_text", "")
        date_str = job.get("date", "")

        desc_skills, categorized = extract_skills(description + " " + title)
        schedule = contract_map.get(contract, infer_schedule_type(title, description))
        is_remote = infer_remote([], location, title, description)
        no_degree = infer_no_degree(description)
        health_ins = infer_health_insurance(description)
        short_title = shorten_title(title)

        salary_rate, salary_year, salary_hour = "", "", ""
        if salary_text:
            nums = re.findall(r"\d+", salary_text.replace(" ", ""))
            if nums:
                avg_tnd = sum(int(n) for n in nums) / len(nums)
                salary_rate = "year"
                salary_year = f"{avg_tnd * 12:.0f}"

        posted = ""
        if date_str:
            for fr_m, num_m in french_months.items():
                if fr_m in date_str.lower():
                    day_match = re.search(r"(\d{1,2})", date_str)
                    year_match = re.search(r"(\d{4})", date_str)
                    if day_match and year_match:
                        posted = f"{year_match.group(1)}-{num_m}-{int(day_match.group(1)):02d}"
                    break

        location_full = f"{location}, Tunisia" if "tunisia" not in location.lower() and "tunisie" not in location.lower() else location

        rows.append({
            "job_title_short": short_title,
            "job_title": title,
            "job_location": location_full,
            "job_via": "Keejob",
            "job_schedule_type": schedule,
            "job_work_from_home": "TRUE" if is_remote else "FALSE",
            "search_location": "Tunisia",
            "job_posted_date": posted,
            "job_no_degree_mention": "TRUE" if no_degree else "FALSE",
            "job_health_insurance": "TRUE" if health_ins else "FALSE",
            "job_country": "Tunisia",
            "salary_rate": salary_rate,
            "salary_year_avg": salary_year,
            "salary_hour_avg": salary_hour,
            "company_name": company,
            "job_skills": str(desc_skills) if desc_skills else "",
            "job_type_skills": str(categorized) if categorized else "",
            "job_url": job.get("url", ""),
        })
    return rows


def main():
    all_rows = []

    try:
        remoteok_data = fetch_remoteok()
        all_rows.extend(process_remoteok(remoteok_data))
    except Exception as e:
        print(f"RemoteOK fetch failed: {e}", file=sys.stderr)

    try:
        arbeitnow_data = fetch_arbeitnow(pages=3)
        all_rows.extend(process_arbeitnow(arbeitnow_data))
    except Exception as e:
        print(f"Arbeitnow fetch failed: {e}", file=sys.stderr)

    try:
        keejob_data = fetch_keejob(pages=5)
        all_rows.extend(process_keejob(keejob_data))
    except Exception as e:
        print(f"Keejob fetch failed: {e}", file=sys.stderr)

    if not all_rows:
        print("No data retrieved.", file=sys.stderr)
        sys.exit(1)

    columns = [
        "job_title_short", "job_title", "job_location", "job_via",
        "job_schedule_type", "job_work_from_home", "search_location",
        "job_posted_date", "job_no_degree_mention", "job_health_insurance",
        "job_country", "salary_rate", "salary_year_avg", "salary_hour_avg",
        "company_name", "job_skills", "job_type_skills", "job_url",
    ]

    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "jobs_output_final.csv")
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(columns)
        for row in all_rows:
            writer.writerow([row.get(c, "") for c in columns])

    print(f"Saved {len(all_rows)} rows to {output_path}")


if __name__ == "__main__":
    main()
