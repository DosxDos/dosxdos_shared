"use client";

import {
  FiClock,
  FiTruck,
  FiUsers,
  FiFileText,
  FiGrid,
  FiLogOut,
  FiExternalLink,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiEyeOff,
  FiLoader,
  FiCheck,
  FiAlertCircle,
  FiAlertTriangle,
  FiInfo,
  FiArrowLeft,
  FiMenu,
  FiChevronDown,
  FiChevronRight,
  FiUser,
  FiX,
  FiStar,
  FiFlag,
  FiBell,
} from "react-icons/fi";
import type { IconBaseProps } from "react-icons";

/**
 * Every icon in the app, in one file.
 *
 * Swapping icon library becomes a one-file change, and aria-hidden cannot be
 * forgotten at a call site.
 */
type IconProps = IconBaseProps;

export const IconEye = (props: IconProps) => <FiEye aria-hidden="true" {...props} />;
export const IconEyeOff = (props: IconProps) => <FiEyeOff aria-hidden="true" {...props} />;
export const IconLoader = (props: IconProps) => <FiLoader aria-hidden="true" {...props} />;
export const IconCheck = (props: IconProps) => <FiCheck aria-hidden="true" {...props} />;
export const IconAlert = (props: IconProps) => <FiAlertCircle aria-hidden="true" {...props} />;
export const IconWarning = (props: IconProps) => <FiAlertTriangle aria-hidden="true" {...props} />;
export const IconInfo = (props: IconProps) => <FiInfo aria-hidden="true" {...props} />;
export const IconBack = (props: IconProps) => <FiArrowLeft aria-hidden="true" {...props} />;
export const IconMenu = (props: IconProps) => <FiMenu aria-hidden="true" {...props} />;
export const IconChevronDown = (props: IconProps) => <FiChevronDown aria-hidden="true" {...props} />;
export const IconChevronRight = (props: IconProps) => <FiChevronRight aria-hidden="true" {...props} />;
export const IconUser = (props: IconProps) => <FiUser aria-hidden="true" {...props} />;
export const IconClose = (props: IconProps) => <FiX aria-hidden="true" {...props} />;
export const IconStar = (props: IconProps) => <FiStar aria-hidden="true" {...props} />;
export const IconFlag = (props: IconProps) => <FiFlag aria-hidden="true" {...props} />;
export const IconBell = (props: IconProps) => <FiBell aria-hidden="true" {...props} />;

// Iconos de las aplicaciones del portal y de la cabecera.
export const IconClock = (props: IconProps) => <FiClock aria-hidden="true" {...props} />;
export const IconTruck = (props: IconProps) => <FiTruck aria-hidden="true" {...props} />;
export const IconUsers = (props: IconProps) => <FiUsers aria-hidden="true" {...props} />;
export const IconFile = (props: IconProps) => <FiFileText aria-hidden="true" {...props} />;
export const IconGrid = (props: IconProps) => <FiGrid aria-hidden="true" {...props} />;
export const IconLogout = (props: IconProps) => <FiLogOut aria-hidden="true" {...props} />;
export const IconExternal = (props: IconProps) => <FiExternalLink aria-hidden="true" {...props} />;



// Filled circle variants — the toast icons reloj-laboral uses.
export const IconCheckCircle = (props: IconProps) => <FiCheckCircle aria-hidden="true" {...props} />;
export const IconXCircle = (props: IconProps) => <FiXCircle aria-hidden="true" {...props} />;
