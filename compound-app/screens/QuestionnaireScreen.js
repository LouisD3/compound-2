// screens/QuestionnaireScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Button, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Switch
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const TOTAL_PAGES = 12;

const BOTTLENECK_OPTIONS = ['Scripting', 'Editing', 'Staying Consistent'];
const NICHE_OPTIONS = [
  'Venture Capital',
  'Startups/Build in Public',
  'Fitness',
  'Lifestyle/Vlogs',
  'Business/Entrepreneurship',
  'Career Advice',
  'Tech/Product Reviews',
  'Cooking/Food',
  'Language Learning',
  'Dating/Relationships',
  'Travel',
  'Real Estate',
  'Other'
];
const ANGLE_OPTIONS = ['Educational', 'Entertaining', 'Inspirational', 'Other'];
const PLATFORM_OPTIONS = ['LinkedIn', 'Twitter', 'Instagram', 'TikTok', 'YouTube', 'Facebook'];

export default function QuestionnaireScreen() {
  const navigation = useNavigation();

  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState({
    contentMotivation: {
      trueReason: '',
      tellOthers: '',
      gap: ''
    },
    bottleneck: '',
    bottleneckDeepDive: '',
    authentication: {
      linkedin: false,
      twitter: false,
      gmail: false
    },
    niche: '',
    angle: '',
    creatorResearch: '',
    audienceDefinition: '',
    platformPreferences: [],
    platformUsage: [],
    goals: {
      followers: 0,
      views: 0,
      subscribers: 0
    }
  });

  const handleNext = () => {
    if (currentPage === TOTAL_PAGES - 1) {
      console.log('Questionnaire answers:', answers);
      navigation.replace('Main');
      return;
    }
    setCurrentPage((prev) => prev + 1);
  };

  const handlePrevious = () => {
    if (currentPage === 0) return;
    setCurrentPage((prev) => prev - 1);
  };

  const isPageValid = () => {
    switch (currentPage) {
      case 0: // Welcome - always valid
        return true;
      case 1: // Content Motivation
        return answers.contentMotivation.trueReason.trim() && 
               answers.contentMotivation.tellOthers.trim() && 
               answers.contentMotivation.gap.trim();
      case 2: // Bottleneck
        return answers.bottleneck !== '';
      case 3: // Bottleneck Deep Dive
        return answers.bottleneckDeepDive.trim() !== '';
      case 4: // Authentication
        return answers.authentication.linkedin || 
               answers.authentication.twitter || 
               answers.authentication.gmail;
      case 5: // Niche
        return answers.niche !== '';
      case 6: // Angle
        return answers.angle !== '';
      case 7: // Creator Research
        return answers.creatorResearch.trim() !== '';
      case 8: // Audience Definition
        return answers.audienceDefinition.trim() !== '';
      case 9: // Platform Preferences
        return answers.platformPreferences.length > 0;
      case 10: // Platform Usage
        return answers.platformUsage.length > 0;
      case 11: // Goal Setting
        return true; // Goals are optional
      default:
        return true;
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 0:
        return (
          <View style={styles.welcomeContainer}>
            <View style={styles.iconsContainer}>
              <View style={styles.starsIcon}>
                <View style={[styles.star, styles.star1]} />
                <View style={[styles.star, styles.star2]} />
                <View style={[styles.star, styles.star3]} />
              </View>
              <View style={styles.barsIcon}>
                <View style={[styles.bar, styles.bar1]} />
                <View style={[styles.bar, styles.bar2]} />
                <View style={[styles.bar, styles.bar3]} />
                <View style={[styles.bar, styles.bar4]} />
              </View>
            </View>
            <Text style={styles.brandName}>compound</Text>
            <Text style={styles.welcomeTitle}>It all starts with one post</Text>
          </View>
        );

      case 1:
        return (
          <View style={styles.pageContainer}>
            <View style={styles.heartIconContainer}>
              <Text style={styles.heartIcon}>❤️</Text>
            </View>
            <Text style={styles.pageTitle}>Why do you want to post content?</Text>
            <Text style={styles.subtitle}>(be honest)</Text>
            
            <Text style={styles.label}>My TRUE reason for building a personal brand:</Text>
            <TextInput
              style={styles.textArea}
              value={answers.contentMotivation.trueReason}
              onChangeText={(text) => setAnswers({
                ...answers,
                contentMotivation: { ...answers.contentMotivation, trueReason: text }
              })}
              placeholder="Your honest answer"
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>What I tell people my reason is:</Text>
            <TextInput
              style={styles.textArea}
              value={answers.contentMotivation.tellOthers}
              onChangeText={(text) => setAnswers({
                ...answers,
                contentMotivation: { ...answers.contentMotivation, tellOthers: text }
              })}
              placeholder="What you'd say publicly"
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>The gap between these two (if any):</Text>
            <TextInput
              style={styles.textArea}
              value={answers.contentMotivation.gap}
              onChangeText={(text) => setAnswers({
                ...answers,
                contentMotivation: { ...answers.contentMotivation, gap: text }
              })}
              placeholder="Describe the gap"
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
            />
          </View>
        );

      case 2:
        return (
          <View style={styles.pageContainer}>
            <Text style={styles.pageTitle}>What's your biggest bottleneck?</Text>
            {BOTTLENECK_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  answers.bottleneck === option && styles.optionButtonSelected
                ]}
                onPress={() => setAnswers({ ...answers, bottleneck: option })}
              >
                <Text style={[
                  styles.optionText,
                  answers.bottleneck === option && styles.optionTextSelected
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 3:
        return (
          <View style={styles.pageContainer}>
            <Text style={styles.pageTitle}>Why haven't you solved it?</Text>
            <TextInput
              style={styles.textArea}
              value={answers.bottleneckDeepDive}
              onChangeText={(text) => setAnswers({ ...answers, bottleneckDeepDive: text })}
              placeholder="Be honest about what's holding you back"
              multiline
              numberOfLines={6}
            />
          </View>
        );

      case 4:
        return (
          <View style={styles.pageContainer}>
            <Text style={styles.pageTitle}>Who are you?</Text>
            <Text style={styles.subtitle}>Connect with LinkedIn, Twitter, or Gmail</Text>
            
            <TouchableOpacity
              style={[
                styles.authButton,
                answers.authentication.linkedin && styles.authButtonSelected
              ]}
              onPress={() => setAnswers({
                ...answers,
                authentication: { ...answers.authentication, linkedin: !answers.authentication.linkedin }
              })}
            >
              <Text style={styles.authButtonText}>LinkedIn</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.authButton,
                answers.authentication.twitter && styles.authButtonSelected
              ]}
              onPress={() => setAnswers({
                ...answers,
                authentication: { ...answers.authentication, twitter: !answers.authentication.twitter }
              })}
            >
              <Text style={styles.authButtonText}>Twitter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.authButton,
                answers.authentication.gmail && styles.authButtonSelected
              ]}
              onPress={() => setAnswers({
                ...answers,
                authentication: { ...answers.authentication, gmail: !answers.authentication.gmail }
              })}
            >
              <Text style={styles.authButtonText}>Gmail</Text>
            </TouchableOpacity>
          </View>
        );

      case 5:
        return (
          <View style={styles.pageContainer}>
            <Text style={styles.pageTitle}>Question 1: What is your niche?</Text>
            <ScrollView style={styles.optionsScroll}>
              {NICHE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    answers.niche === option && styles.optionButtonSelected
                  ]}
                  onPress={() => setAnswers({ ...answers, niche: option })}
                >
                  <Text style={[
                    styles.optionText,
                    answers.niche === option && styles.optionTextSelected
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case 6:
        return (
          <View style={styles.pageContainer}>
            <Text style={styles.pageTitle}>Question 2: What is your angle?</Text>
            {ANGLE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  answers.angle === option && styles.optionButtonSelected
                ]}
                onPress={() => setAnswers({ ...answers, angle: option })}
              >
                <Text style={[
                  styles.optionText,
                  answers.angle === option && styles.optionTextSelected
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 7:
        return (
          <View style={styles.pageContainer}>
            <Text style={styles.pageTitle}>Who is growing fast in your niche?</Text>
            <TextInput
              style={styles.textArea}
              value={answers.creatorResearch}
              onChangeText={(text) => setAnswers({ ...answers, creatorResearch: text })}
              placeholder="Enter creator names/handles"
              multiline
              numberOfLines={6}
            />
          </View>
        );

      case 8:
        return (
          <View style={styles.pageContainer}>
            <Text style={styles.pageTitle}>Who are you trying to reach?</Text>
            <TextInput
              style={styles.textArea}
              value={answers.audienceDefinition}
              onChangeText={(text) => setAnswers({ ...answers, audienceDefinition: text })}
              placeholder="Describe your target audience"
              multiline
              numberOfLines={6}
            />
          </View>
        );

      case 9:
        return (
          <View style={styles.pageContainer}>
            <Text style={styles.pageTitle}>Where do you want to post?</Text>
            <ScrollView style={styles.optionsScroll}>
              {PLATFORM_OPTIONS.map((platform) => {
                const isSelected = answers.platformPreferences.includes(platform);
                return (
                  <TouchableOpacity
                    key={platform}
                    style={[
                      styles.optionButton,
                      isSelected && styles.optionButtonSelected
                    ]}
                    onPress={() => {
                      const newPrefs = isSelected
                        ? answers.platformPreferences.filter(p => p !== platform)
                        : [...answers.platformPreferences, platform];
                      setAnswers({ ...answers, platformPreferences: newPrefs });
                    }}
                  >
                    <Text style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected
                    ]}>
                      {platform} {isSelected && '✓'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        );

      case 10:
        return (
          <View style={styles.pageContainer}>
            <Text style={styles.pageTitle}>Where do you spend the most time?</Text>
            <ScrollView style={styles.optionsScroll}>
              {PLATFORM_OPTIONS.map((platform) => {
                const isSelected = answers.platformUsage.includes(platform);
                return (
                  <TouchableOpacity
                    key={platform}
                    style={[
                      styles.optionButton,
                      isSelected && styles.optionButtonSelected
                    ]}
                    onPress={() => {
                      const newUsage = isSelected
                        ? answers.platformUsage.filter(p => p !== platform)
                        : [...answers.platformUsage, platform];
                      setAnswers({ ...answers, platformUsage: newUsage });
                    }}
                  >
                    <Text style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected
                    ]}>
                      {platform} {isSelected && '✓'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        );

      case 11:
        return (
          <View style={styles.pageContainer}>
            <Text style={styles.pageTitle}>What's your goal?</Text>
            
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>
                Followers: {answers.goals.followers.toLocaleString()}
              </Text>
              <View style={styles.sliderRow}>
                <Text style={styles.sliderMin}>0</Text>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${(answers.goals.followers / 1000000) * 100}%` }]} />
                </View>
                <Text style={styles.sliderMax}>1M</Text>
              </View>
              <View style={styles.sliderButtons}>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setAnswers({
                    ...answers,
                    goals: { ...answers.goals, followers: Math.max(0, answers.goals.followers - 1000) }
                  })}
                >
                  <Text>-</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setAnswers({
                    ...answers,
                    goals: { ...answers.goals, followers: Math.min(1000000, answers.goals.followers + 1000) }
                  })}
                >
                  <Text>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>
                Views: {answers.goals.views.toLocaleString()}
              </Text>
              <View style={styles.sliderRow}>
                <Text style={styles.sliderMin}>0</Text>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${(answers.goals.views / 10000000) * 100}%` }]} />
                </View>
                <Text style={styles.sliderMax}>10M</Text>
              </View>
              <View style={styles.sliderButtons}>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setAnswers({
                    ...answers,
                    goals: { ...answers.goals, views: Math.max(0, answers.goals.views - 10000) }
                  })}
                >
                  <Text>-</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setAnswers({
                    ...answers,
                    goals: { ...answers.goals, views: Math.min(10000000, answers.goals.views + 10000) }
                  })}
                >
                  <Text>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>
                Subscribers: {answers.goals.subscribers.toLocaleString()}
              </Text>
              <View style={styles.sliderRow}>
                <Text style={styles.sliderMin}>0</Text>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${(answers.goals.subscribers / 100000) * 100}%` }]} />
                </View>
                <Text style={styles.sliderMax}>100K</Text>
              </View>
              <View style={styles.sliderButtons}>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setAnswers({
                    ...answers,
                    goals: { ...answers.goals, subscribers: Math.max(0, answers.goals.subscribers - 100) }
                  })}
                >
                  <Text>-</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setAnswers({
                    ...answers,
                    goals: { ...answers.goals, subscribers: Math.min(100000, answers.goals.subscribers + 100) }
                  })}
                >
                  <Text>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const renderProgressDots = () => {
    return (
      <View style={styles.progressDotsContainer}>
        {Array.from({ length: TOTAL_PAGES }).map((_, index) => (
          <View key={index} style={styles.progressDotContainer}>
            <View
              style={[
                styles.progressDot,
                index === currentPage && styles.progressDotActive
              ]}
            />
            {index === currentPage && <View style={styles.progressDotBar} />}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressBarContainer}>
        {renderProgressDots()}
        <Text style={styles.progressText}>
          {currentPage + 1} / {TOTAL_PAGES}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderPage()}
      </ScrollView>

      <View style={styles.buttonsRow}>
        {currentPage === 1 && (
          <TouchableOpacity style={styles.previewButton}>
            <Text style={styles.previewButtonText}>Aperçu</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, !isPageValid() && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!isPageValid()}
        >
          <Text style={styles.buttonTextPrimary}>
            {currentPage === 0 ? "Let's Begin" : currentPage === TOTAL_PAGES - 1 ? "Finish" : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  progressBarContainer: {
    padding: 16,
    paddingTop: 40,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
  },
  pageContainer: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  optionsScroll: {
    maxHeight: 400,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  optionButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  authButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  authButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  authButtonText: {
    fontSize: 16,
    color: '#333',
  },
  sliderContainer: {
    marginBottom: 32,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderMin: {
    fontSize: 12,
    color: '#666',
    width: 30,
  },
  sliderTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  sliderMax: {
    fontSize: 12,
    color: '#666',
    width: 40,
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  sliderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    color: '#333',
  },
  buttonTextPrimary: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
