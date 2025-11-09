"""
OpenAI Service for AI-generated insights using GPT-4.
"""

from openai import AsyncOpenAI
from app.config import settings
from typing import Dict, List, Optional
import logging
import os

logger = logging.getLogger(__name__)


class OpenAIService:
    """Service for GPT insight generation."""
    
    def __init__(self):
        self._client = None
        self.model = "gpt-5-nano"
    
    @property
    def client(self):
        """Lazy initialization of OpenAI client."""
        if self._client is None:
            # Set API key in environment if not already set
            if settings.openai_api_key:
                os.environ['OPENAI_API_KEY'] = settings.openai_api_key
            # Initialize client - it will read from environment
            self._client = AsyncOpenAI()
        return self._client
    
    @staticmethod
    def _build_input(system_prompt: str, user_prompt: str) -> List[Dict]:
        """Build Responses API input payload with system and user messages."""
        return [
            {
                "role": "system",
                "content": [
                    {"type": "input_text", "text": system_prompt}
                ],
            },
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": user_prompt}
                ],
            },
        ]
    
    def _extract_text(self, response) -> str:
        """
        Extract text from OpenAI Responses API response.
        """
        # Responses API uses output_text directly
        output_text = getattr(response, "output_text", None)
        logger.debug(f"Response type: {type(response)}, has output_text: {hasattr(response, 'output_text')}")
        logger.debug(f"output_text value: {output_text}")
        
        if isinstance(output_text, str) and output_text.strip():
            return output_text.strip()
        
        # Log response structure for debugging
        logger.warning(f"Empty or invalid output_text. Response attributes: {dir(response)}")
        return ""
    
    async def generate_daily_insights(self, health_summary: Dict, user_name: str = "there") -> str:
        """
        Generate morning insights based on yesterday's health data.
        
        Args:
            health_summary: Dictionary with recent health metrics
            user_name: User's name for personalization
        
        Returns:
            AI-generated insights text
        """
        try:
            # Build prompt with available metrics
            metrics_text = []
            
            if health_summary.get('sleep_hours_latest'):
                metrics_text.append(f"- Sleep: {health_summary['sleep_hours_latest']}h")
            
            if health_summary.get('step_count_latest'):
                metrics_text.append(f"- Steps: {health_summary['step_count_latest']:,.0f}")
            
            if health_summary.get('resting_heart_rate_latest'):
                metrics_text.append(f"- Resting HR: {health_summary['resting_heart_rate_latest']:.0f}bpm")
            
            if health_summary.get('hrv_sdnn_latest'):
                metrics_text.append(f"- HRV: {health_summary['hrv_sdnn_latest']:.0f}ms")
            
            if health_summary.get('active_energy_burned_latest'):
                metrics_text.append(f"- Active Calories: {health_summary['active_energy_burned_latest']:.0f}kcal")
            
            prompt = f"""You are a caring, empathetic health coach speaking to {user_name}.

Yesterday's Health Summary:
{chr(10).join(metrics_text)}

Generate 1-2 brief, actionable insights (2-3 sentences each).
Be warm, encouraging, and specific to the data.
Focus on what they're doing well and one gentle suggestion.
Use conversational, friendly language.
Avoid medical advice or alarmist language."""

            response = await self.client.responses.create(
                model=self.model,
                input=self._build_input(
                    "You are an empathetic health coach who provides encouraging, actionable insights.",
                    prompt,
                ),
            )
            
            insights = self._extract_text(response)
            if not insights:
                logger.warning("OpenAI API returned empty content; using friendly fallback")
                return "I looked over your recent data, but couldn't generate a note right now. Please try again in a moment."
            logger.info(f"Generated daily insights ({len(insights)} chars)")
            return insights
            
        except Exception as e:
            logger.error(f"Error generating daily insights: {e}")
            raise
    
    async def generate_weekly_digest(
        self,
        health_summary: Dict,
        correlations: List[Dict],
        anomalies: List[Dict],
        trends: List[Dict],
        user_name: str = "there"
    ) -> str:
        """
        Generate comprehensive weekly health digest.
        
        Args:
            health_summary: Weekly averages
            correlations: Detected correlations
            anomalies: Detected anomalies
            trends: Trend analysis
            user_name: User's name
        
        Returns:
            AI-generated weekly digest
        """
        try:
            # Build context
            trends_text = []
            for trend in trends[:3]:
                emoji = "📈" if trend['trend_direction'] == "Increasing" else "📉" if trend['trend_direction'] == "Decreasing" else "➡️"
                trends_text.append(f"  {emoji} {trend['metric']}: {trend['trend_direction']} ({trend['percent_change']:+.0f}%)")
            
            correlations_text = []
            for corr in correlations[:3]:
                correlations_text.append(f"  • {corr['metric_a']} ↔ {corr['metric_b']}: {corr['strength']} {corr['direction']}")
            
            prompt = f"""You are a health coach providing a weekly health review to {user_name}.

WEEKLY SUMMARY (Last 7 Days):
- Average Sleep: {health_summary.get('sleep_hours_avg', 'N/A')}h
- Average Steps: {health_summary.get('step_count_avg', 'N/A'):,.0f}
- Resting HR: {health_summary.get('resting_heart_rate_avg', 'N/A'):.0f}bpm

KEY TRENDS:
{chr(10).join(trends_text) if trends_text else "  No significant trends"}

INSIGHTS DISCOVERED:
{chr(10).join(correlations_text) if correlations_text else "  No new correlations"}

ANOMALIES THIS WEEK: {len(anomalies)}

Generate a warm, comprehensive weekly summary (3-4 paragraphs):
1. Celebrate what went well
2. Note any concerning patterns
3. Provide 2-3 specific, actionable recommendations

Be encouraging, specific, and avoid alarmist language."""

            response = await self.client.responses.create(
                model=self.model,
                input=self._build_input(
                    "You are an empathetic health coach providing weekly summaries.",
                    prompt,
                ),
            )
            
            digest = self._extract_text(response)
            if not digest:
                raise ValueError("OpenAI returned empty weekly digest content")
            logger.info(f"Generated weekly digest ({len(digest)} chars)")
            return digest
            
        except Exception as e:
            logger.error(f"Error generating weekly digest: {e}")
            raise
    
    async def explain_anomaly(
        self,
        anomaly_context: Dict,
        user_name: str = "there"
    ) -> str:
        """
        Generate empathetic explanation for an anomaly.
        
        Args:
            anomaly_context: Anomaly details with context
            user_name: User's name
        
        Returns:
            AI-generated anomaly explanation
        """
        try:
            date = anomaly_context.get('date', 'recently')
            metric = anomaly_context.get('target_variable', 'a health metric')
            value = anomaly_context.get('target_value')
            
            # Build context about related anomalies
            related = anomaly_context.get('related_anomalies', [])
            related_text = []
            for rel in related[:3]:
                direction = "higher" if rel['z_score'] > 0 else "lower"
                related_text.append(f"  • Your {rel['variable']} was also {direction} than usual")
            
            prompt = f"""You're explaining a health anomaly to {user_name} in a caring, non-alarming way.

ANOMALY DETECTED:
On {date}, your {metric.replace('_', ' ')} was unusually {'high' if value else 'different'} at {value}.

RELATED FACTORS:
{chr(10).join(related_text) if related_text else "  No other unusual factors detected"}

Write 2-3 sentences that:
1. Acknowledge the unusual pattern
2. Provide possible explanations
3. Offer reassurance and a suggestion

Be warm, specific, and avoid medical advice."""

            response = await self.client.responses.create(
                model=self.model,
                input=self._build_input(
                    "You are a caring health advisor explaining health patterns.",
                    prompt,
                ),
            )
            
            explanation = self._extract_text(response)
            if not explanation:
                raise ValueError("OpenAI returned empty anomaly explanation")
            logger.info(f"Generated anomaly explanation")
            return explanation
            
        except Exception as e:
            logger.error(f"Error explaining anomaly: {e}")
            return f"We noticed something unusual in your health data on {anomaly_context.get('date')}. This can happen for various reasons like changes in routine, stress, or activity levels. Consider reviewing your activities around that time and see if anything stands out."
    
    async def explain_all_anomalies(
        self,
        anomalies: List[Dict],
        health_summary: Dict,
        trends: List[Dict],
        user_name: str = "there"
    ) -> str:
        """
        Generate comprehensive explanation of all detected anomalies.
        
        Analyzes all anomalies together to identify patterns, common causes,
        and provide actionable insights.
        
        Args:
            anomalies: List of all detected anomalies with dates, metrics, values, deviations
            health_summary: Recent health metrics for context
            trends: Trend analysis to understand context
            user_name: User's name for personalization
        
        Returns:
            AI-generated comprehensive anomaly analysis
        """
        try:
            if not anomalies:
                return f"Great news, {user_name}! No significant anomalies were detected in your recent health data. Your metrics have been within normal ranges."
            
            # Group anomalies by metric
            anomalies_by_metric = {}
            for anomaly in anomalies:
                metric = anomaly.get('metric', 'unknown')
                if metric not in anomalies_by_metric:
                    anomalies_by_metric[metric] = []
                anomalies_by_metric[metric].append(anomaly)
            
            # Build anomaly summary
            anomaly_summary = []
            for metric, metric_anomalies in anomalies_by_metric.items():
                count = len(metric_anomalies)
                # Convert dates to strings (handle pandas Timestamp objects)
                dates = []
                for a in metric_anomalies:
                    date_val = a.get('date', 'unknown')
                    if hasattr(date_val, 'strftime'):  # pandas Timestamp or datetime
                        dates.append(date_val.strftime('%Y-%m-%d'))
                    elif isinstance(date_val, str):
                        dates.append(date_val)
                    else:
                        dates.append(str(date_val))
                
                avg_deviation = sum(abs(a.get('deviation', 0)) for a in metric_anomalies) / count
                direction = "high" if metric_anomalies[0].get('deviation', 0) > 0 else "low"
                
                anomaly_summary.append(
                    f"  • {metric.replace('_', ' ').title()}: {count} anomaly/ies detected "
                    f"({direction} values, avg deviation: {avg_deviation:.1f}σ). "
                    f"Dates: {', '.join(dates[:3])}{'...' if len(dates) > 3 else ''}"
                )
            
            # Build recent health context
            context_text = []
            if health_summary.get('sleep_hours_avg'):
                context_text.append(f"- Average Sleep: {health_summary['sleep_hours_avg']:.1f}h")
            if health_summary.get('step_count_avg'):
                context_text.append(f"- Average Steps: {health_summary['step_count_avg']:,.0f}")
            if health_summary.get('resting_heart_rate_avg'):
                context_text.append(f"- Average Resting HR: {health_summary['resting_heart_rate_avg']:.0f}bpm")
            
            # Build trends context
            trends_text = []
            for trend in trends[:3]:
                direction_emoji = "📈" if trend['trend_direction'] == "Increasing" else "📉"
                trends_text.append(f"  {direction_emoji} {trend['metric'].replace('_', ' ').title()}: {trend['trend_direction']} ({trend.get('percent_change', 0):+.1f}%)")
            
            # Identify patterns in anomalies
            pattern_insights = []
            if len(anomalies) > 1:
                # Check if anomalies cluster around specific dates
                anomaly_dates = []
                for a in anomalies:
                    date_val = a.get('date')
                    if hasattr(date_val, 'strftime'):  # pandas Timestamp or datetime
                        anomaly_dates.append(date_val.strftime('%Y-%m-%d'))
                    elif isinstance(date_val, str):
                        anomaly_dates.append(date_val)
                    else:
                        anomaly_dates.append(str(date_val) if date_val else 'unknown')
                
                if len(set(anomaly_dates)) < len(anomalies) * 0.7:  # If many anomalies on same dates
                    pattern_insights.append("Multiple anomalies occurred on the same days, suggesting possible lifestyle or environmental factors.")
                
                # Check if anomalies are in related metrics
                if 'sleep_hours' in anomalies_by_metric and 'resting_heart_rate' in anomalies_by_metric:
                    pattern_insights.append("Anomalies in both sleep and heart rate suggest potential stress or recovery issues.")
            
            prompt = f"""You are a caring health coach analyzing anomalies in {user_name}'s health data.

ANOMALIES DETECTED ({len(anomalies)} total):
{chr(10).join(anomaly_summary)}

RECENT HEALTH CONTEXT (Last 7 Days):
{chr(10).join(context_text) if context_text else "  Limited recent data available"}

CURRENT TRENDS:
{chr(10).join(trends_text) if trends_text else "  No significant trends"}

PATTERN OBSERVATIONS:
{chr(10).join(pattern_insights) if pattern_insights else "  No clear patterns detected in anomaly timing"}

Generate a comprehensive, empathetic analysis (3-4 paragraphs) that:

1. **Overview**: Start with a warm, reassuring summary of what anomalies were detected. Frame it as insights, not alarms.

2. **Pattern Analysis**: 
   - Identify if anomalies cluster around specific dates or times
   - Note if multiple related metrics were anomalous together (e.g., sleep + heart rate)
   - Explain what these patterns might indicate (stress, illness, lifestyle changes, etc.)

3. **Possible Explanations**: For each major anomaly type, provide 2-3 likely explanations:
   - Lifestyle factors (sleep, activity, stress)
   - Environmental factors (weather, schedule changes)
   - Normal variations (some variation is expected)
   - Be specific to the metrics involved

4. **Actionable Insights**: Provide 2-3 specific recommendations:
   - What to monitor going forward
   - Lifestyle adjustments that might help
   - When to be concerned vs. when it's likely normal variation

5. **Reassurance**: End with encouragement - remind them that anomalies are data points to learn from, not necessarily problems.

Be warm, specific, data-driven, and avoid medical advice. Use the actual anomaly details and patterns to make your analysis relevant and helpful."""

            response = await self.client.responses.create(
                model=self.model,
                input=self._build_input(
                    "You are a caring, empathetic health coach who explains health anomalies in a reassuring, educational way. You help users understand their data without causing alarm.",
                    prompt,
                ),
            )
            
            analysis = self._extract_text(response)
            if not analysis:
                raise ValueError("OpenAI returned empty anomaly analysis")
            logger.info(f"Generated comprehensive anomaly analysis ({len(analysis)} chars)")
            return analysis
            
        except Exception as e:
            logger.error(f"Error generating anomaly analysis: {e}")
            raise
    
    async def explain_pattern(
        self,
        pattern: Dict,
        user_name: str = "there"
    ) -> str:
        """
        Generate explanation for a discovered behavioral pattern.
        
        Args:
            pattern: Pattern details
            user_name: User's name
        
        Returns:
            AI-generated pattern explanation
        """
        try:
            prompt = f"""You've discovered a health pattern for {user_name}.

PATTERN DISCOVERED:
{pattern.get('narrative', 'A pattern was detected in your health data')}

Statistical confidence: {pattern.get('confidence_level', 'medium')}
Effect size: {pattern.get('percent_change', 0):+.0f}%

Write 2-3 sentences that:
1. Explain the pattern in simple terms
2. Explain why this matters
3. Provide an actionable tip

Be encouraging and make it personal."""

            response = await self.client.responses.create(
                model=self.model,
                input=self._build_input(
                    "You are a health coach explaining discovered patterns.",
                    prompt,
                ),
            )
            
            explanation = self._extract_text(response)
            if not explanation:
                raise ValueError("OpenAI returned empty pattern explanation")
            logger.info(f"Generated pattern explanation")
            return explanation
            
        except Exception as e:
            logger.error(f"Error explaining pattern: {e}")
            raise
    
    
    async def generate_tomorrow_prediction(
        self,
        health_summary: Dict,
        trends: List[Dict],
        patterns: Dict,
        correlations: List[Dict],
        user_name: str = "there"
    ) -> str:
        """
        Generate predictive insights about what to expect tomorrow based on recent patterns.
        
        Args:
            health_summary: Recent health metrics (last 7 days)
            trends: Trend analysis showing direction of changes
            patterns: Detected behavioral patterns (e.g., sleep-sugar relationships)
            correlations: Significant correlations between metrics
            user_name: User's name for personalization
        
        Returns:
            AI-generated prediction for tomorrow
        """
        try:
            # Build recent metrics context
            metrics_text = []
            if health_summary.get('sleep_hours_avg'):
                latest_sleep = health_summary.get('sleep_hours_latest', health_summary.get('sleep_hours_avg'))
                metrics_text.append(f"- Sleep: {latest_sleep:.1f}h (avg: {health_summary['sleep_hours_avg']:.1f}h)")
            
            if health_summary.get('step_count_avg'):
                latest_steps = health_summary.get('step_count_latest', health_summary.get('step_count_avg'))
                metrics_text.append(f"- Steps: {latest_steps:,.0f} (avg: {health_summary['step_count_avg']:,.0f})")
            
            if health_summary.get('resting_heart_rate_avg'):
                latest_hr = health_summary.get('resting_heart_rate_latest', health_summary.get('resting_heart_rate_avg'))
                metrics_text.append(f"- Resting HR: {latest_hr:.0f}bpm (avg: {health_summary['resting_heart_rate_avg']:.0f}bpm)")
            
            if health_summary.get('active_energy_burned_avg'):
                latest_cal = health_summary.get('active_energy_burned_latest', health_summary.get('active_energy_burned_avg'))
                metrics_text.append(f"- Active Calories: {latest_cal:.0f}kcal (avg: {health_summary['active_energy_burned_avg']:.0f}kcal)")
            
            # Build trends context
            trends_text = []
            for trend in trends[:5]:
                direction_emoji = "📈" if trend['trend_direction'] == "Increasing" else "📉" if trend['trend_direction'] == "Decreasing" else "➡️"
                change = trend.get('percent_change', 0)
                trends_text.append(f"  {direction_emoji} {trend['metric']}: {trend['trend_direction']} by {abs(change):.1f}% over the period")
            
            # Build patterns context
            patterns_text = []
            if patterns.get('sleep_sugar', {}).get('pattern_detected'):
                sleep_sugar = patterns['sleep_sugar']
                patterns_text.append(f"  • Sleep-Sugar Pattern: When you sleep < {sleep_sugar.get('sleep_threshold', 6):.1f}h, your sugar intake changes by {sleep_sugar.get('percent_change', 0):+.0f}% the next day")
            
            # Build correlations context (most relevant for predictions)
            correlations_text = []
            for corr in correlations[:3]:
                if corr.get('strength') in ['Strong', 'Moderate']:
                    correlations_text.append(f"  • {corr['metric_a']} ↔ {corr['metric_b']}: {corr['strength']} {corr['direction']} relationship")
            
            prompt = f"""You are a predictive health coach helping {user_name} understand what to expect tomorrow based on their recent health patterns.

RECENT HEALTH DATA (Last 7 Days):
{chr(10).join(metrics_text)}

CURRENT TRENDS:
{chr(10).join(trends_text) if trends_text else "  No significant trends detected"}

BEHAVIORAL PATTERNS DISCOVERED:
{chr(10).join(patterns_text) if patterns_text else "  No specific patterns detected yet"}

KEY RELATIONSHIPS:
{chr(10).join(correlations_text) if correlations_text else "  No strong correlations detected"}

Based on this data, generate a personalized prediction for tomorrow (2-3 paragraphs):

1. **What to Expect**: Based on recent trends and patterns, what should they anticipate for tomorrow? Consider:
   - If trends are continuing, what metrics might follow the pattern?
   - If they had poor sleep today, what might that mean for tomorrow (based on detected patterns)?
   - If activity has been increasing/decreasing, what's the likely trajectory?

2. **Actionable Preparation**: Give 1-2 specific, actionable tips to optimize tomorrow based on:
   - Current trends (e.g., "Your sleep has been improving, so maintain your bedtime routine")
   - Detected patterns (e.g., "Since poor sleep affects your next-day sugar intake, prioritize 7+ hours tonight")
   - Recent performance (e.g., "You've been hitting 8K+ steps, keep the momentum going")

3. **What to Watch For**: Mention 1-2 specific metrics(energy, sleep, steps, etc.) or patterns to pay attention to tomorrow.

Be encouraging, specific, and data-driven. Use the patterns and trends to make realistic predictions. Avoid generic advice - tie everything back to their actual data patterns. Write in a warm, conversational tone."""

            response = await self.client.responses.create(
                model=self.model,
                input=self._build_input(
                    "You are a predictive health coach who uses data patterns to help users prepare for tomorrow. You make realistic, data-driven predictions based on trends and patterns.",
                    prompt,
                ),
            )
            
            prediction = self._extract_text(response)
            if not prediction:
                raise ValueError("OpenAI returned empty prediction")
            logger.info(f"Generated tomorrow prediction ({len(prediction)} chars)")
            return prediction
            
        except Exception as e:
            logger.error(f"Error generating tomorrow prediction: {e}")
            raise
    
    async def generate_actionable_decisions(
        self,
        health_summary: Dict,
        trends: List[Dict],
        patterns: Dict,
        correlations: List[Dict],
        anomalies: List[Dict],
        user_name: str = "there"
    ) -> str:
        """
        Generate specific, decision-focused insights that help users make informed health decisions.
        
        Focuses on actionable recommendations with clear decision points and expected outcomes.
        
        Args:
            health_summary: Recent health metrics (last 7-30 days)
            trends: Trend analysis showing direction of changes
            patterns: Detected behavioral patterns
            correlations: Significant correlations between metrics
            anomalies: Detected anomalies
            user_name: User's name for personalization
        
        Returns:
            AI-generated decision-focused insights
        """
        try:
            # Build current health status
            status_text = []
            if health_summary.get('sleep_hours_avg'):
                latest = health_summary.get('sleep_hours_latest', health_summary.get('sleep_hours_avg'))
                avg = health_summary.get('sleep_hours_avg', 0)
                status_text.append(f"- Sleep: {latest:.1f}h last night (avg: {avg:.1f}h)")
            
            if health_summary.get('step_count_avg'):
                latest = health_summary.get('step_count_latest', health_summary.get('step_count_avg'))
                avg = health_summary.get('step_count_avg', 0)
                status_text.append(f"- Steps: {latest:,.0f} yesterday (avg: {avg:,.0f})")
            
            if health_summary.get('resting_heart_rate_avg'):
                latest = health_summary.get('resting_heart_rate_latest', health_summary.get('resting_heart_rate_avg'))
                avg = health_summary.get('resting_heart_rate_avg', 0)
                status_text.append(f"- Resting HR: {latest:.0f}bpm (avg: {avg:.0f}bpm)")
            
            # Build decision-relevant trends
            trends_text = []
            for trend in trends[:5]:
                direction_emoji = "📈" if trend['trend_direction'] == "Increasing" else "📉" if trend['trend_direction'] == "Decreasing" else "➡️"
                change = trend.get('percent_change', 0)
                metric_name = trend['metric'].replace('_', ' ').title()
                trends_text.append(f"  {direction_emoji} {metric_name}: {trend['trend_direction']} by {abs(change):.1f}%")
            
            # Build patterns that inform decisions
            patterns_text = []
            if patterns.get('sleep_sugar', {}).get('pattern_detected'):
                ss = patterns['sleep_sugar']
                patterns_text.append(f"  • Sleep-Sugar Pattern: Sleeping < {ss.get('sleep_threshold', 6):.1f}h leads to {abs(ss.get('percent_change', 0)):.0f}% change in next-day sugar intake")
            
            # Build correlations that inform decisions
            correlations_text = []
            for corr in correlations[:3]:
                if corr.get('strength') in ['Strong', 'Moderate']:
                    correlations_text.append(f"  • {corr['metric_a'].replace('_', ' ').title()} ↔ {corr['metric_b'].replace('_', ' ').title()}: {corr['strength']} {corr['direction']} relationship")
            
            # Build anomaly context for decisions
            anomaly_context = []
            if anomalies:
                anomaly_metrics = set(a.get('metric', '') for a in anomalies)
                anomaly_context.append(f"  • {len(anomalies)} anomaly/ies detected in: {', '.join(m.replace('_', ' ').title() for m in anomaly_metrics)}")
            
            prompt = f"""You are a health decision coach helping {user_name} make specific, informed decisions about their health based on their data.

CURRENT HEALTH STATUS:
{chr(10).join(status_text) if status_text else "  Limited recent data"}

TRENDS (What's changing):
{chr(10).join(trends_text) if trends_text else "  No significant trends"}

PATTERNS DISCOVERED (What affects what):
{chr(10).join(patterns_text) if patterns_text else "  No specific patterns detected yet"}

KEY RELATIONSHIPS:
{chr(10).join(correlations_text) if correlations_text else "  No strong correlations detected"}

ANOMALIES TO CONSIDER:
{chr(10).join(anomaly_context) if anomaly_context else "  No significant anomalies"}

Generate specific, decision-focused insights (3-4 paragraphs) that help {user_name} make informed choices:

1. **Immediate Decision Points**: Identify 2-3 specific decisions they should make RIGHT NOW based on their current data:
   - "Based on your [metric] being [value] vs your average of [avg], you should decide to [specific action]"
   - "Given your [trend], you need to decide whether to [option A] or [option B]"
   - Be specific: "Aim for 7.5 hours of sleep tonight" not "get more sleep"
   - Include the expected outcome: "This should help improve your [related metric] by [expected change]"

2. **Strategic Decisions**: Based on patterns and correlations, what longer-term decisions should they consider?
   - "Since [pattern] shows that [X] affects [Y], you should decide to prioritize [specific action]"
   - "Given the strong correlation between [A] and [B], consider deciding to [specific strategy]"
   - Include trade-offs: "If you choose to [option], expect [outcome], but if you choose [alternative], expect [different outcome]"

3. **Decision Framework**: Provide a simple decision-making framework:
   - "When [condition], decide to [action]"
   - "If [metric] is [threshold], then [decision], otherwise [alternative decision]"
   - Make it actionable: "Monitor [metric] daily, and if it stays above [value] for 3 days, decide to [action]"

4. **What to Decide Next**: Give them a clear next step:
   - "Your next decision should be: [specific, measurable action]"
   - "By [timeframe], decide whether [option] is working by checking if [metric] has [changed]"

Be specific, actionable, and decision-oriented. Use actual numbers and metrics from their data. Frame everything as decisions they can make, not just observations. Help them understand the consequences of different choices. Write in a confident, supportive tone that empowers them to take action."""

            response = await self.client.responses.create(
                model=self.model,
                input=self._build_input(
                    "You are a health decision coach who helps users make specific, informed decisions about their health. You provide actionable recommendations with clear decision points and expected outcomes.",
                    prompt,
                ),
            )
            
            decisions = self._extract_text(response)
            if not decisions:
                raise ValueError("OpenAI returned empty decision guidance")
            logger.info(f"Generated actionable decisions ({len(decisions)} chars)")
            return decisions
            
        except Exception as e:
            logger.error(f"Error generating actionable decisions: {e}")
            raise


# Singleton instance
openai_service = OpenAIService()

